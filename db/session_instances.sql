-- Create session_instances table for tracking individual Moodle sessions
CREATE TABLE IF NOT EXISTS session_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_session_id UUID REFERENCES recurring_sessions(id) ON DELETE CASCADE,
  cohort_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  session_date DATE NOT NULL,
  period INTEGER NOT NULL,
  moodle_session_id INTEGER, -- The actual Moodle session ID returned from API
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent duplicate sessions for same cohort/course/date/period
  UNIQUE(cohort_id, course_id, session_date, period)
);

-- Index for faster lookups when checking duplicates
CREATE INDEX IF NOT EXISTS idx_session_instances_lookup 
ON session_instances(cohort_id, session_date, period);
