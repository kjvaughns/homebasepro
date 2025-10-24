-- Allow trigger and backend to create profiles during signup
CREATE POLICY "trigger_can_insert_profiles"
ON public.profiles
FOR INSERT
TO postgres, service_role
WITH CHECK (true);