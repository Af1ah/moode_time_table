import { moodleClient } from './moodle-client';

/**
 * Session creation parameters
 */
export interface SessionParams {
  attendanceId: number;
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM format
  duration?: number; // Duration in minutes (default: 60)
  description?: string;
}

/**
 * Session creation result
 */
export interface SessionResult {
  success: boolean;
  sessionId?: number;
  error?: string;
  details?: any;
}

/**
 * Creates an attendance session in Moodle
 * This is a shared service used by both individual session creation and schedule sync
 * 
 * @param params - Session parameters
 * @returns Session creation result
 */
export async function createAttendanceSession(params: SessionParams): Promise<SessionResult> {
  try {
    const { attendanceId, date, time, duration = 60, description = 'Session' } = params;

    // Validate required fields
    if (!attendanceId || !date || !time) {
      return {
        success: false,
        error: 'Missing required fields: attendanceId, date, or time',
      };
    }

    // Parse date and time to create session timestamp
    const sessionDate = new Date(`${date}T${time}`);
    const sessiontime = Math.floor(sessionDate.getTime() / 1000); // Unix timestamp

    // Session duration in seconds
    const durationSeconds = duration * 60;

    // Prepare session data for mod_attendance_add_session
    const sessionData = {
      sessiontime,
      duration: durationSeconds,
      description,
    };

    // Create the session in Moodle using mod_attendance_add_session
    const session = await moodleClient.addSession(attendanceId, sessionData);

    return {
      success: true,
      sessionId: session.id,
    };

  } catch (error: any) {
    console.error('Create session error:', error);
    
    return {
      success: false,
      error: error.message || 'Failed to create session',
      details: error.response?.data || null,
    };
  }
}

/**
 * Creates an attendance session from a Date object and period index
 * Useful for schedule sync functionality
 * 
 * @param attendanceId - Moodle attendance instance ID
 * @param date - Date object for the session
 * @param periodIndex - Period index (0-based) 
 * @param duration - Duration in seconds (default: 3600)
 * @param description - Session description
 * @returns Session creation result
 */
export async function createAttendanceSessionFromSchedule(
  attendanceId: number,
  date: Date,
  periodIndex: number,
  duration: number = 3600,
  description?: string
): Promise<SessionResult> {
  try {
    // Calculate start time based on period index (assuming 9 AM start)
    const startTime = new Date(date);
    startTime.setHours(9 + periodIndex, 0, 0, 0);
    
    const sessiontime = Math.floor(startTime.getTime() / 1000);
    
    const sessionData = {
      sessiontime,
      duration,
      description: description || `Generated Session for Period ${periodIndex + 1}`,
    };

    const session = await moodleClient.addSession(attendanceId, sessionData);

    return {
      success: true,
      sessionId: session.id,
    };

  } catch (error: any) {
    console.error('Create session error:', error);
    
    return {
      success: false,
      error: error.message || 'Failed to create session',
      details: error.response?.data || null,
    };
  }
}
