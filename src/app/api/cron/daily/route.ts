import { NextResponse } from 'next/server';
import { moodleClient } from '@/lib/moodle-client';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'; // Ensure it's not cached

export async function GET(request: Request) {
  // Check for a secret key to prevent unauthorized access if needed
  // const authHeader = request.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  try {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
    
    // Skip weekends if configured (Simple check: 0 or 6)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
       return NextResponse.json({ message: 'Weekend - No sync performed' });
    }

    // Fetch ALL schedules for today
    const todaysSchedule = await prisma.masterSchedule.findMany({
      where: {
        dayOfWeek: dayOfWeek,
      },
    });

    if (todaysSchedule.length === 0) {
      return NextResponse.json({ message: 'No classes scheduled for today' });
    }

    const results = [];
    const dateStr = today.toISOString().split('T')[0];

    for (const slot of todaysSchedule) {
      try {
        // 1. Ensure Attendance Instance
        const attendanceId = await moodleClient.ensureAttendanceInstance(
          slot.courseId,
          slot.courseName,
          "Attendance"
        );

        // 2. Create Session
        const startTime = new Date(dateStr);
        startTime.setHours(9 + slot.periodIndex, 0, 0, 0); // 9 AM start
        
        const sessionData = {
          sessdate: Math.floor(startTime.getTime() / 1000),
          duration: 3600, // 1 hour
          description: `Auto-Generated Session (Period ${slot.periodIndex + 1})`,
          // Add students/group if needed. 
          // If cohortId maps to a Moodle Group, we should add `groupid`.
          // For now, we assume standard course enrollment.
        };

        // Check if session already exists to avoid duplicates?
        // moodleClient.getSessions(attendanceId) -> check timestamps.
        // Optimization for later. Moodle might allow duplicates or we rely on "Master Schedule" being the source of truth.
        // A robust system would check first.
        
        const session = await moodleClient.addSession(attendanceId, sessionData);
        results.push({ slotId: slot.id, status: 'created', sessionId: session.id });

      } catch (err: any) {
        console.error(`Failed for slot ${slot.id}:`, err);
        results.push({ slotId: slot.id, status: 'failed', error: err.message });
      }
    }

    // Log to SyncLog (Optional, if we added it to schema)
    // await prisma.syncLog.create({ ... });

    return NextResponse.json({ 
      success: true, 
      processed: results.length, 
      details: results 
    });

  } catch (error: any) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
