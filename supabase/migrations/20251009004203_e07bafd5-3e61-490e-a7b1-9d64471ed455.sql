-- Team Management Enhancement: Add compensation, timesheets, and payroll tables

-- Create enum for team member roles
CREATE TYPE team_role AS ENUM ('owner', 'manager', 'technician', 'admin');

-- Update team_members table with additional fields
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{"can_view_clients": true, "can_manage_appointments": true, "can_view_revenue": false, "can_manage_team": false}'::jsonb,
ADD COLUMN IF NOT EXISTS team_role team_role DEFAULT 'technician';

-- Create team_member_compensation table
CREATE TABLE IF NOT EXISTS team_member_compensation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid REFERENCES team_members(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  pay_type text NOT NULL CHECK (pay_type IN ('hourly', 'salary', 'commission')),
  pay_rate numeric NOT NULL CHECK (pay_rate >= 0),
  bank_account_last4 text,
  routing_number_encrypted text,
  account_number_encrypted text,
  direct_deposit_enabled boolean DEFAULT false,
  effective_date timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on compensation
ALTER TABLE team_member_compensation ENABLE ROW LEVEL SECURITY;

-- RLS Policies for compensation
CREATE POLICY "Organization owners can manage team compensation"
ON team_member_compensation FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM organizations
    WHERE organizations.id = team_member_compensation.organization_id
    AND organizations.owner_id = auth.uid()
  )
);

CREATE POLICY "Team members can view their own compensation"
ON team_member_compensation FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.id = team_member_compensation.team_member_id
    AND team_members.user_id = auth.uid()
  )
);

-- Create timesheets table
CREATE TABLE IF NOT EXISTS timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid REFERENCES team_members(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  service_visit_id uuid REFERENCES service_visits(id) ON DELETE SET NULL,
  clock_in timestamp with time zone NOT NULL,
  clock_out timestamp with time zone,
  break_minutes integer DEFAULT 0,
  total_hours numeric GENERATED ALWAYS AS (
    CASE 
      WHEN clock_out IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600 - (break_minutes / 60.0)
      ELSE 0
    END
  ) STORED,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on timesheets
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for timesheets
CREATE POLICY "Organization owners can manage all timesheets"
ON timesheets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM organizations
    WHERE organizations.id = timesheets.organization_id
    AND organizations.owner_id = auth.uid()
  )
);

CREATE POLICY "Team members can manage their own timesheets"
ON timesheets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.id = timesheets.team_member_id
    AND team_members.user_id = auth.uid()
  )
);

-- Create payroll_runs table
CREATE TABLE IF NOT EXISTS payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'failed')),
  total_amount numeric NOT NULL DEFAULT 0,
  processed_at timestamp with time zone,
  processed_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on payroll_runs
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payroll_runs
CREATE POLICY "Organization owners can manage payroll runs"
ON payroll_runs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM organizations
    WHERE organizations.id = payroll_runs.organization_id
    AND organizations.owner_id = auth.uid()
  )
);

-- Create payroll_items table
CREATE TABLE IF NOT EXISTS payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid REFERENCES payroll_runs(id) ON DELETE CASCADE NOT NULL,
  team_member_id uuid REFERENCES team_members(id) ON DELETE CASCADE NOT NULL,
  regular_hours numeric DEFAULT 0,
  overtime_hours numeric DEFAULT 0,
  gross_pay numeric NOT NULL,
  deductions numeric DEFAULT 0,
  net_pay numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  payment_date timestamp with time zone,
  payment_method text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on payroll_items
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payroll_items
CREATE POLICY "Organization owners can manage payroll items"
ON payroll_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM payroll_runs pr
    JOIN organizations o ON o.id = pr.organization_id
    WHERE pr.id = payroll_items.payroll_run_id
    AND o.owner_id = auth.uid()
  )
);

CREATE POLICY "Team members can view their own payroll items"
ON payroll_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.id = payroll_items.team_member_id
    AND team_members.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_member_compensation_team_member ON team_member_compensation(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_member_compensation_org ON team_member_compensation(organization_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_team_member ON timesheets(team_member_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_org ON timesheets(organization_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_org ON payroll_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_run ON payroll_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_team_member ON payroll_items(team_member_id);

-- Add trigger for updated_at columns
CREATE TRIGGER update_team_member_compensation_updated_at
BEFORE UPDATE ON team_member_compensation
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timesheets_updated_at
BEFORE UPDATE ON timesheets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_runs_updated_at
BEFORE UPDATE ON payroll_runs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_items_updated_at
BEFORE UPDATE ON payroll_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();