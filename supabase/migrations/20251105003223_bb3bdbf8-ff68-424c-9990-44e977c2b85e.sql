-- Drop the problematic triggers on auth.users that are blocking signups
DROP TRIGGER IF EXISTS create_default_notification_prefs ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create a safe trigger on public.profiles instead
-- This runs AFTER our admin-signup function creates the profile
CREATE TRIGGER create_default_notification_prefs
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_notification_preferences();