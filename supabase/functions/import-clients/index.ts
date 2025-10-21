import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportClient {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  status?: string;
  notes?: string;
  tags?: string;
}

interface ImportError {
  row: number;
  reason: string;
  data: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { clients, organizationId, duplicateHandling, defaultStatus, importTag, dryRun } = await req.json();

    console.log(`Starting import: ${clients.length} rows, org ${organizationId}, mode ${duplicateHandling}`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: ImportError[] = [];

    // Create tag if specified
    let tagId: string | null = null;
    if (importTag && !dryRun) {
      const { data: existingTag } = await supabase
        .from('client_tags')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('name', importTag)
        .single();

      if (existingTag) {
        tagId = existingTag.id;
      } else {
        const { data: newTag, error: tagError } = await supabase
          .from('client_tags')
          .insert({
            organization_id: organizationId,
            name: importTag,
            color: '#6366f1',
          })
          .select('id')
          .single();

        if (!tagError && newTag) {
          tagId = newTag.id;
        }
      }
    }

    // Process clients in batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < clients.length; i += BATCH_SIZE) {
      const batch = clients.slice(i, i + BATCH_SIZE);

      for (let j = 0; j < batch.length; j++) {
        const rowNum = i + j + 1;
        const client: ImportClient = batch[j];

        try {
          // Validate required fields
          if (!client.name && !client.email && !client.phone) {
            errors.push({
              row: rowNum,
              reason: 'Missing required field: must have at least name, email, or phone',
              data: client,
            });
            skipped++;
            continue;
          }

          // Check for duplicates
          let existingClient = null;
          if (duplicateHandling !== 'create') {
            const query = supabase
              .from('clients')
              .select('id')
              .eq('organization_id', organizationId);

            if (client.email) {
              query.or(`email.ilike.${client.email}`);
            }
            if (client.phone) {
              const normalizedPhone = client.phone.replace(/\D/g, '');
              query.or(`phone.ilike.%${normalizedPhone}%`);
            }

            const { data } = await query.limit(1).single();
            existingClient = data;
          }

          // Prepare client data
          const clientData: any = {
            organization_id: organizationId,
            name: client.name || client.email || client.phone || 'Unknown',
            email: client.email || null,
            phone: client.phone || null,
            address: [client.address, client.city, client.state, client.zip].filter(Boolean).join(', ') || null,
            status: client.status?.toLowerCase() || defaultStatus,
            notes: client.notes || null,
          };

          if (existingClient) {
            if (duplicateHandling === 'skip') {
              skipped++;
              continue;
            } else if (duplicateHandling === 'update' && !dryRun) {
              // Update existing client
              const { error: updateError } = await supabase
                .from('clients')
                .update(clientData)
                .eq('id', existingClient.id);

              if (updateError) throw updateError;
              updated++;

              // Add tag if specified
              if (tagId) {
                await supabase
                  .from('client_tag_assignments')
                  .upsert({
                    client_id: existingClient.id,
                    tag_id: tagId,
                  });
              }
            } else {
              updated++;
            }
          } else {
            // Create new client
            if (!dryRun) {
              const { data: newClient, error: insertError } = await supabase
                .from('clients')
                .insert(clientData)
                .select('id')
                .single();

              if (insertError) throw insertError;

              // Add tag if specified
              if (tagId && newClient) {
                await supabase
                  .from('client_tag_assignments')
                  .insert({
                    client_id: newClient.id,
                    tag_id: tagId,
                  });
              }

              // Handle tags from CSV
              if (client.tags && newClient) {
                const tagNames = client.tags.split(',').map(t => t.trim()).filter(Boolean);
                for (const tagName of tagNames) {
                  // Find or create tag
                  let { data: tag } = await supabase
                    .from('client_tags')
                    .select('id')
                    .eq('organization_id', organizationId)
                    .eq('name', tagName)
                    .single();

                  if (!tag) {
                    const { data: newTag } = await supabase
                      .from('client_tags')
                      .insert({
                        organization_id: organizationId,
                        name: tagName,
                        color: '#6366f1',
                      })
                      .select('id')
                      .single();
                    tag = newTag;
                  }

                  if (tag) {
                    await supabase
                      .from('client_tag_assignments')
                      .insert({
                        client_id: newClient.id,
                        tag_id: tag.id,
                      });
                  }
                }
              }
            }
            created++;
          }
        } catch (error: any) {
          console.error(`Error processing row ${rowNum}:`, error);
          errors.push({
            row: rowNum,
            reason: error.message,
            data: client,
          });
          skipped++;
        }
      }
    }

    console.log(`Import complete: ${created} created, ${updated} updated, ${skipped} skipped, ${errors.length} errors`);

    return new Response(
      JSON.stringify({ created, updated, skipped, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Import function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
