-- 1. Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Create the heartbeat trigger
-- This runs every minute and calls the backend. 
-- The backend then checks if it's the right time and if it hasn't sent today.
SELECT cron.schedule('marketing-heartbeat', '* * * * *', $$
  SELECT net.http_post(
    url := 'YOUR_BACKEND_PUBLIC_URL/api/sms/execute-scheduled-blast',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
$$);

-- Note: To delete the old static schedule:
-- SELECT cron.unschedule('daily-marketing-sms');
