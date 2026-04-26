CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'poll-telegram-updates',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://xiabzxurtsanzmkniozf.supabase.co/functions/v1/telegram-poll',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpYWJ6eHVydHNhbnpta25pb3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NTUwMzAsImV4cCI6MjA5MjQzMTAzMH0.fbyQdKubC7Flus9FbFK0YeqyYUADxiKCKH7W4cBWa3U"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);