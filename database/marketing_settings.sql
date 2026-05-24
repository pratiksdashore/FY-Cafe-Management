-- Create marketing_settings table
CREATE TABLE IF NOT EXISTS marketing_settings (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    daily_notification_time TIME DEFAULT '12:00:00',
    is_enabled BOOLEAN DEFAULT FALSE,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial settings if not exists
INSERT INTO marketing_settings (daily_notification_time, is_enabled)
SELECT '12:00:00', FALSE
WHERE NOT EXISTS (SELECT 1 FROM marketing_settings);
