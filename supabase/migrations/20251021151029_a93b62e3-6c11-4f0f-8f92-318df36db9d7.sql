-- Create availability checking function for booking conflict prevention
CREATE OR REPLACE FUNCTION public.check_provider_availability(
  p_provider_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
BEGIN
  -- Returns TRUE if provider is available (no conflicts)
  -- Returns FALSE if provider has conflicting booking
  RETURN NOT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE provider_org_id = p_provider_id
      AND status NOT IN ('canceled', 'rejected')
      AND (
        -- Check for any time overlap
        (date_time_start <= p_start_time AND date_time_end > p_start_time) OR
        (date_time_start < p_end_time AND date_time_end >= p_end_time) OR
        (date_time_start >= p_start_time AND date_time_end <= p_end_time)
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;