-- Add active_scenario to profiles so scenario choice persists across devices
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS active_scenario TEXT NOT NULL DEFAULT 'standard'
    CHECK (active_scenario IN ('standard', 'soft', 'firm'));
