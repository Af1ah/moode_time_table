-- Create recurring_sessions table
CREATE TABLE IF NOT EXISTS recurring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id INTEGER NOT NULL,
  cohort_name VARCHAR(255) NOT NULL,
  course_id INTEGER NOT NULL,
  course_name VARCHAR(255) NOT NULL,
  day_of_week INTEGER NOT NULL,
  period INTEGER NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  description TEXT DEFAULT 'regular class',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_recurring_sessions_cohort_dates 
ON recurring_sessions(cohort_id, start_date, end_date);
