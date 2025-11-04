import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  X,
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  DollarSign,
  FileText,
  Calendar,
  Tag,
  Sparkles,
  Building,
  Receipt,
  Edit,
} from "lucide-react";
import { useClientDetail, useClientActivity, useClientStats } from "@/pages/provider/hooks/useClientsData";
import { Skeleton } from "@/components/ui/skeleton";
import ClientActivityTimeline from "./ClientActivityTimeline";
import ClientFilesTab from "./ClientFilesTab";
import ClientBillingTab from "./ClientBillingTab";
import ClientAITab from "./ClientAITab";
import { useState } from "react";
import AddClientNoteModal from "./AddClientNoteModal";
import CreateJobModal from "./CreateJobModal";
import { EditClientDialog } from "./EditClientDialog";
import { CreateInvoiceModal } from "./CreateInvoiceModal";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClientDrawerProps {
  clientId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ClientDrawer({ clientId, onClose, onUpdate }: ClientDrawerProps) {
  const navigate = useNavigate();
  const { client, loading, refetch } = useClientDetail(clientId);
  const { timeline, loading: activityLoading } = useClientActivity(clientId);
  const { stats, loading: statsLoading } = useClientStats(clientId);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Client not found</p>
      </div>
    );
  }

  const handleMessage = async () => {
    if (!client.homeowner_profile_id) {
      toast.error('Client profile not found');
      return;
    }
    
    try {
      // Get current user's org
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single();
      
      if (!org) return;
      
      // Check if conversation exists
      let conversationId = client.conversation_id;
      
      if (!conversationId) {
        // Create conversation
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            homeowner_profile_id: client.homeowner_profile_id,
            provider_org_id: org.id
          })
          .select('id')
          .single();
        
        if (convError) throw convError;
        
        // Create members
        await supabase.from('conversation_members').insert([
          { conversation_id: newConv.id, profile_id: client.homeowner_profile_id },
          { conversation_id: newConv.id, profile_id: profile.id }
        ]);
        
        conversationId = newConv.id;
      }
      
      navigate(`/provider/messages?conversation=${conversationId}`);
      onClose();
    } catch (error) {
      console.error('Error opening conversation:', error);
      toast.error('Failed to open conversation');
    }
  };

  const handleEmail = () => {
    if (client.email) {
      window.location.href = `mailto:${client.email}`;
    }
  };

  const handleCall = () => {
    if (client.phone) {
      window.location.href = `tel:${client.phone}`;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-bold">{client.name}</h2>
              <Badge variant={client.status === "active" ? "default" : "secondary"}>
                {client.status}
              </Badge>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setShowEditDialog(true)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-1 text-sm text-muted-foreground">
              {client.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <button
                    onClick={handleCall}
                    className="hover:text-primary hover:underline"
                  >
                    {client.phone}
                  </button>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <button
                    onClick={handleEmail}
                    className="hover:text-primary hover:underline"
                  >
                    {client.email}
                  </button>
                </div>
              )}
              {client.property_address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {client.property_address}, {client.property_city}, {client.property_state}
                  </span>
                </div>
              )}
            </div>

            {client.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {client.tags.map((tag, i) => (
                  <Badge key={i} variant="outline">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={handleMessage}
            disabled={!client.homeowner_profile_id}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Message
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleEmail}
            disabled={!client.email}
          >
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowJobModal(true)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            New Job
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowInvoiceModal(true)}
          >
            <Receipt className="h-4 w-4 mr-2" />
            Send Invoice
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNoteModal(true)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="overview" className="w-full">
          <div className="border-b px-6">
            <TabsList className="w-full justify-start bg-transparent h-auto p-0">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Activity
              </TabsTrigger>
              <TabsTrigger
                value="messages"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Messages
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Files
              </TabsTrigger>
              <TabsTrigger
                value="billing"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Billing
              </TabsTrigger>
              <TabsTrigger
                value="ai"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                AI
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="overview" className="mt-0 space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Lifetime Value
                  </div>
                  <div className="text-2xl font-bold">
                    ${statsLoading ? "..." : stats.lifetimeValue.toLocaleString()}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Total Jobs
                  </div>
                  <div className="text-2xl font-bold">
                    {statsLoading ? "..." : stats.totalJobs}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Outstanding
                  </div>
                  <div className="text-2xl font-bold text-destructive">
                    ${statsLoading ? "..." : stats.outstandingBalance.toLocaleString()}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Last Service
                  </div>
                  <div className="text-lg font-bold">
                    {statsLoading
                      ? "..."
                      : stats.lastServiceDate
                      ? new Date(stats.lastServiceDate).toLocaleDateString()
                      : "Never"}
                  </div>
                </Card>
              </div>

              {/* Properties */}
              {client.properties.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Properties
                  </h3>
                  <div className="space-y-3">
                    {client.properties.map((prop: any) => (
                      <Card key={prop.id} className="p-4">
                        <div className="font-medium">{prop.address_line_1}</div>
                        {prop.address_line_2 && (
                          <div className="text-sm text-muted-foreground">
                            {prop.address_line_2}
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          {prop.city}, {prop.state} {prop.zip_code}
                        </div>
                        {(prop.square_footage || prop.lot_size) && (
                          <div className="text-xs text-muted-foreground mt-2">
                            {prop.square_footage && `${prop.square_footage} sqft`}
                            {prop.square_footage && prop.lot_size && " • "}
                            {prop.lot_size && `${prop.lot_size} acres`}
                          </div>
                        )}
                        {prop.notes && (
                          <p className="text-sm mt-2 text-muted-foreground">
                            {prop.notes}
                          </p>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Subscriptions */}
              {client.subscriptions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Active Plans</h3>
                  <div className="space-y-3">
                    {client.subscriptions.map((sub: any) => (
                      <Card key={sub.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">
                              {sub.service_plan?.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ${sub.service_plan?.price_per_visit}/visit
                            </div>
                          </div>
                          <Badge>{sub.status}</Badge>
                        </div>
                        {sub.next_billing_date && (
                          <div className="text-xs text-muted-foreground mt-2">
                            Next billing: {new Date(sub.next_billing_date).toLocaleDateString()}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity Preview */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
                {activityLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : timeline.length > 0 ? (
                  <div className="space-y-2">
                    {timeline.slice(0, 5).map((item) => (
                      <Card key={item.id} className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(item.date).toLocaleDateString()}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{item.title}</div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {item.description}
                              </div>
                            )}
                          </div>
                          {item.status && (
                            <Badge variant="outline" className="text-xs">
                              {item.status}
                            </Badge>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              <ClientActivityTimeline
                timeline={timeline}
                loading={activityLoading}
              />
            </TabsContent>

            <TabsContent value="messages" className="mt-0">
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Messages with {client.name}
                </h3>
                <p className="text-muted-foreground mb-4">
                  Start a conversation with this client
                </p>
                <Button onClick={handleMessage}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Open Messages
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="files" className="mt-0">
              <ClientFilesTab
                clientId={client.id}
                files={client.files}
                onUpdate={refetch}
              />
            </TabsContent>

            <TabsContent value="billing" className="mt-0">
              <ClientBillingTab
                client={client}
                subscriptions={client.subscriptions}
                payments={client.payments}
              />
            </TabsContent>

            <TabsContent value="ai" className="mt-0">
              <ClientAITab client={client} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Modals */}
      <AddClientNoteModal
        open={showNoteModal}
        onOpenChange={setShowNoteModal}
        clientId={client.id}
        onSuccess={() => {
          setShowNoteModal(false);
          refetch();
          onUpdate();
        }}
      />

      <CreateJobModal
        open={showJobModal}
        onOpenChange={setShowJobModal}
        preSelectedClient={{
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone || '',
          address: client.property_address || ''
        }}
        onSuccess={() => {
          setShowJobModal(false);
          refetch();
          onUpdate();
        }}
      />

      <CreateInvoiceModal
        open={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        clientId={client.id}
      />
    </div>
  );
}
