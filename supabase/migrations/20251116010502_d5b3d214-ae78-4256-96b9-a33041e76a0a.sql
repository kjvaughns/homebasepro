-- Drop the broken trigger and function that's causing http_request_queue errors
-- The edge function is already being called directly from CreateJobModal.tsx
DROP TRIGGER IF EXISTS on_job_change ON bookings;
DROP FUNCTION IF EXISTS notify_job_status_change();