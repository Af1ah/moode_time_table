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

    // Format the sessions for display
    const sessions = todaySessions.flatMap((course: any) => {
      // Each course has attendance instances
      return course.attendance_instances?.flatMap((instance: any) => {
        // Each instance has today's sessions
        return instance.today_sessions?.map((session: any) => {
          // Format session time
          const sessionDate = new Date(session.sessdate * 1000); // Moodle uses Unix timestamp
          const startHour = sessionDate.getHours();
          const startMinute = sessionDate.getMinutes();
          const endTime = new Date(sessionDate.getTime() + (session.duration || 60) * 1000); // Duration is in seconds
          
          const timeStr = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')} - ${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;

          return {
            time: timeStr,
            courseName: course.fullname || course.shortname,
            cohortName: instance.name || 'Attendance Session', // Use instance name as cohort/description
            period: Math.floor((startHour - 9)), // Approximate period based on hour
            sessionDate: sessionDate.toISOString().split('T')[0],
            sessionId: session.id,
            description: session.description,
            timestamp: session.sessdate // Add timestamp for sorting
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
