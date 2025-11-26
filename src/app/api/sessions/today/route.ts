import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { moodleClient } from '@/lib/moodle-client';

export async function GET(req: NextRequest) {
  try {
    // Get teacher ID from session/cookie
    const token = req.cookies.get('session_token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user info from Moodle using the token
    const siteInfo = await moodleClient.getSiteInfo(token);
    const userId = siteInfo.userid;

    // Fetch today's sessions directly from Moodle
    const todaySessions = await moodleClient.getTodaySessions(userId);
    console.log('Moodle Today Sessions Response:', JSON.stringify(todaySessions, null, 2));

    // Fetch user courses to get Course IDs (since todaySessions might lack them)
    const userCourses = await moodleClient.getUserCourses(userId);
    const courseMap = new Map(userCourses.map((c: any) => [c.shortname, c.id]));
    
    // Extract course IDs to fetch CMIDs
    const courseIds = todaySessions.map((c: any) => c.id || c.courseid || courseMap.get(c.shortname)).filter((id: any) => !!id);
    console.log('Resolved Course IDs:', courseIds);

    // Create a map of attendanceId -> cmid
    const cmidMap: Record<number, number> = {};
    
    if (courseIds.length > 0) {
        try {
            await Promise.all(courseIds.map(async (courseId: number) => {
                try {
                    const instances = await moodleClient.getAttendanceInstances(courseId);
                    instances.forEach((inst: any) => {
                        // inst.id is the Course Module ID (cmid)
                        // inst.instance is the Attendance Instance ID
                        if (inst.instance && inst.id) {
                            cmidMap[inst.instance] = inst.id;
                        }
                    });
                } catch (e) {
                    console.warn(`Failed to fetch instances for course ${courseId}`, e);
                }
            }));
        } catch (e) {
            console.error('Error fetching CMIDs:', e);
        }
    }
    console.log('CMID Map:', JSON.stringify(cmidMap, null, 2));

    // Format the sessions for display
    const sessions = todaySessions.flatMap((course: any) => {
      // Each course has attendance instances
      return course.attendance_instances?.flatMap((instance: any) => {
        console.log('Attendance Instance Structure:', JSON.stringify(instance, null, 2));
        // Each instance has today's sessions
        return instance.today_sessions?.map((session: any) => {
          // Format session time
          const sessionDate = new Date(session.sessdate * 1000); // Moodle uses Unix timestamp
          const startHour = sessionDate.getHours();
          const startMinute = sessionDate.getMinutes();
          const endTime = new Date(sessionDate.getTime() + (session.duration || 60) * 1000); // Duration is in seconds
          
          const timeStr = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')} - ${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;

          // Resolve CMID: try map first, then instance.cmid (if exists), then fallback
          const attendanceId = session.attendanceid; // instance.id in the response might be attendanceId? No, usually instance.id is not present in the user's snippet for instance.
          // User snippet for instance: { name: "...", today_sessions: [...] }
          // So we rely on session.attendanceid
          
          const cmid = cmidMap[attendanceId];

            return {
             id: session.id,                     // ⭐ Add this
    time: timeStr,
    courseName: course.fullname || course.shortname,
    cohortName: instance.name || 'Attendance Session',
    period: Math.floor((startHour - 9)),
    sessionDate: sessionDate.toISOString().split('T')[0],
            sessionId: session.id,
            courseModuleId: cmid, // Use the fetched CMID
            attendanceId: attendanceId,
            description: session.description,
    timestamp: session.sessdate
          };
        }) || [];
      }) || [];
    }).sort((a: any, b: any) => a.timestamp - b.timestamp); // Sort by timestamp ascending

    const today = new Date();
    
    return NextResponse.json({
      date: today.toISOString().split('T')[0],
      userId,
      sessions,
      totalSessions: sessions.length,
    });
  } catch (error: any) {
    console.error('[Today Sessions API]', error);
    
    // Handle authentication errors
    if (error.message?.includes('Invalid token')) {
      return NextResponse.json(
        { error: 'Authentication failed', details: 'Please log in again' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch today\'s sessions', details: error.message },
      { status: 500 }
    );
  }
}
