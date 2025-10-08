-- Phase 1: Simplify Admin Invite System

-- Drop unnecessary tables
DROP TABLE IF EXISTS public.staff CASCADE;
DROP TABLE IF EXISTS public.staff_invites CASCADE;

-- Create simplified admin_invites table
CREATE TABLE public.admin_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role app_role NOT NULL DEFAULT 'moderator'::app_role,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'revoked'))
);

-- Enable RLS on admin_invites
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

-- Admin RLS policies for admin_invites
CREATE POLICY "Admins can manage invites"
ON public.admin_invites
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Invited users can view their own invite
CREATE POLICY "Invited users can view own invite"
ON public.admin_invites
FOR SELECT
USING (
  lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  AND status = 'pending'
);

-- Phase 2: Add Admin SELECT policies to all tables

-- Waitlist
CREATE POLICY "Admins can view waitlist"
ON public.waitlist
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Organizations
CREATE POLICY "Admins can view all organizations"
ON public.organizations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Clients
CREATE POLICY "Admins can view all clients"
ON public.clients
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service Plans
CREATE POLICY "Admins can view all service plans"
ON public.service_plans
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Client Subscriptions
CREATE POLICY "Admins can view all client subscriptions"
ON public.client_subscriptions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Homeowner Subscriptions
CREATE POLICY "Admins can view all homeowner subscriptions"
ON public.homeowner_subscriptions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Homes
CREATE POLICY "Admins can view all homes"
ON public.homes
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service Requests
CREATE POLICY "Admins can view all service requests"
ON public.service_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service Visits
CREATE POLICY "Admins can view all service visits"
ON public.service_visits
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Team Members
CREATE POLICY "Admins can view all team members"
ON public.team_members
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Payments
CREATE POLICY "Admins can view all payments"
ON public.payments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Conversations
CREATE POLICY "Admins can view all conversations"
ON public.conversations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Messages
CREATE POLICY "Admins can view all messages"
ON public.messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Transactions
CREATE POLICY "Admins can view all transactions"
ON public.transactions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin UPDATE/DELETE policies for data management
CREATE POLICY "Admins can update any record"
ON public.waitlist
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any record"
ON public.waitlist
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));