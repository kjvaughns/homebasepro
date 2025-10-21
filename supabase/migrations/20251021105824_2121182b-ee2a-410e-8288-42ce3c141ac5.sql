-- Create services table for service catalog
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  pricing_type text CHECK (pricing_type IN ('flat', 'hourly', 'per_unit')),
  default_price integer,
  estimated_duration_minutes integer,
  required_skills text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create parts_materials table
CREATE TABLE IF NOT EXISTS parts_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  sku text,
  category text,
  cost_price integer,
  markup_percentage numeric(5,2),
  sell_price integer,
  supplier text,
  quantity_on_hand integer DEFAULT 0,
  unit text DEFAULT 'each',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create integrations table
CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  integration_type text NOT NULL,
  provider text NOT NULL,
  is_connected boolean DEFAULT false,
  last_sync_at timestamptz,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for services
CREATE POLICY "Users can manage their org's services"
  ON services FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT organization_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for parts_materials
CREATE POLICY "Users can manage their org's parts"
  ON parts_materials FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT organization_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for integrations
CREATE POLICY "Users can manage their org's integrations"
  ON integrations FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_services_organization_id ON services(organization_id);
CREATE INDEX IF NOT EXISTS idx_parts_materials_organization_id ON parts_materials(organization_id);
CREATE INDEX IF NOT EXISTS idx_integrations_organization_id ON integrations(organization_id);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parts_materials_updated_at
  BEFORE UPDATE ON parts_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();