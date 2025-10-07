-- Create clients table for providers to manage homeowners
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service_plans table (provider-created plans for their clients)
CREATE TABLE public.service_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  billing_frequency TEXT NOT NULL CHECK (billing_frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  service_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client_subscriptions table
CREATE TABLE public.client_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.service_plans(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'canceled')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  next_billing_date TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table (client payments to providers)
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_subscription_id UUID NOT NULL REFERENCES public.client_subscriptions(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  fee_amount INTEGER NOT NULL,
  fee_percent NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, invited_email)
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients
CREATE POLICY "Users can view their organization's clients"
  ON public.clients FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = clients.organization_id
    AND organizations.owner_id = auth.uid()
  ));

CREATE POLICY "Users can insert clients for their organization"
  ON public.clients FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = clients.organization_id
    AND organizations.owner_id = auth.uid()
  ));

CREATE POLICY "Users can update their organization's clients"
  ON public.clients FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = clients.organization_id
    AND organizations.owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete their organization's clients"
  ON public.clients FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = clients.organization_id
    AND organizations.owner_id = auth.uid()
  ));

-- RLS Policies for service_plans
CREATE POLICY "Users can view their organization's service plans"
  ON public.service_plans FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = service_plans.organization_id
    AND organizations.owner_id = auth.uid()
  ));

CREATE POLICY "Users can insert service plans for their organization"
  ON public.service_plans FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = service_plans.organization_id
    AND organizations.owner_id = auth.uid()
  ));

CREATE POLICY "Users can update their organization's service plans"
  ON public.service_plans FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = service_plans.organization_id
    AND organizations.owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete their organization's service plans"
  ON public.service_plans FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = service_plans.organization_id
    AND organizations.owner_id = auth.uid()
  ));

-- RLS Policies for client_subscriptions
CREATE POLICY "Users can view subscriptions for their organization's clients"
  ON public.client_subscriptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.clients
    JOIN public.organizations ON organizations.id = clients.organization_id
    WHERE clients.id = client_subscriptions.client_id
    AND organizations.owner_id = auth.uid()
  ));

CREATE POLICY "Users can insert subscriptions for their organization's clients"
  ON public.client_subscriptions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.clients
    JOIN public.organizations ON organizations.id = clients.organization_id
    WHERE clients.id = client_subscriptions.client_id
    AND organizations.owner_id = auth.uid()
  ));

CREATE POLICY "Users can update subscriptions for their organization's clients"
  ON public.client_subscriptions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.clients
    JOIN public.organizations ON organizations.id = clients.organization_id
    WHERE clients.id = client_subscriptions.client_id
    AND organizations.owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete subscriptions for their organization's clients"
  ON public.client_subscriptions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.clients
    JOIN public.organizations ON organizations.id = clients.organization_id
    WHERE clients.id = client_subscriptions.client_id
    AND organizations.owner_id = auth.uid()
  ));

-- RLS Policies for payments
CREATE POLICY "Users can view payments for their organization"
  ON public.payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.client_subscriptions
    JOIN public.clients ON clients.id = client_subscriptions.client_id
    JOIN public.organizations ON organizations.id = clients.organization_id
    WHERE client_subscriptions.id = payments.client_subscription_id
    AND organizations.owner_id = auth.uid()
  ));

-- RLS Policies for team_members
CREATE POLICY "Users can view their organization's team members"
  ON public.team_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = team_members.organization_id
    AND organizations.owner_id = auth.uid()
  ));

CREATE POLICY "Users can insert team members for their organization"
  ON public.team_members FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = team_members.organization_id
    AND organizations.owner_id = auth.uid()
  ));

CREATE POLICY "Users can update their organization's team members"
  ON public.team_members FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = team_members.organization_id
    AND organizations.owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete their organization's team members"
  ON public.team_members FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = team_members.organization_id
    AND organizations.owner_id = auth.uid()
  ));

-- Triggers for updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_plans_updated_at
  BEFORE UPDATE ON public.service_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_subscriptions_updated_at
  BEFORE UPDATE ON public.client_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_clients_organization_id ON public.clients(organization_id);
CREATE INDEX idx_clients_status ON public.clients(status);
CREATE INDEX idx_service_plans_organization_id ON public.service_plans(organization_id);
CREATE INDEX idx_service_plans_is_active ON public.service_plans(is_active);
CREATE INDEX idx_client_subscriptions_client_id ON public.client_subscriptions(client_id);
CREATE INDEX idx_client_subscriptions_plan_id ON public.client_subscriptions(plan_id);
CREATE INDEX idx_client_subscriptions_status ON public.client_subscriptions(status);
CREATE INDEX idx_payments_client_subscription_id ON public.payments(client_subscription_id);
CREATE INDEX idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX idx_team_members_organization_id ON public.team_members(organization_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);