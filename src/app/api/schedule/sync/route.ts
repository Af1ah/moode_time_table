import { NextResponse } from 'next/server';
import { moodleClient } from '@/lib/moodle-client';
import { prisma } from '@/lib/prisma';
import { createAttendanceSessionFromSchedule } from '@/lib/session-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, cohortIds } = body; // date is YYYY-MM-DD

    if (!date || !cohortIds || !Array.isArray(cohortIds)) {
      return NextResponse.json({ error: 'Missing date or cohortIds' }, { status: 400 });
    }

    const dateObj = new Date(date);
    const jsDay = dateObj.getDay(); 
    const dbDay = jsDay - 1;

    if (dbDay < 0 || dbDay > 4) {
       return NextResponse.json({ message: 'Today is a weekend. No schedule to sync.' });
    }

    // Check for existing sessions for this date and cohorts
    const existingSessions = await prisma.sessionInstance.findMany({
      where: {
        cohortId: { in: cohortIds.map(Number) },
        sessionDate: dateObj,
      }
    });

    if (existingSessions.length > 0) {
      return NextResponse.json({ 
        warning: true, 
        message: `Sessions already exist for this date. Are you sure you want to duplicate/overwrite?`,
        existingCount: existingSessions.length
      });
    }

    const allResults: any[] = [];

    for (const cohortId of cohortIds) {
        // Fetch Master Schedule for this day and cohort
        const schedule = await prisma.masterSchedule.findMany({
          where: {
            cohortId: Number(cohortId),
            dayOfWeek: dbDay,
          },
        });

        if (schedule.length === 0) {
          allResults.push({ cohortId, status: 'skipped', message: 'No schedule found' });
          continue;
        }

        for (const slot of schedule) {
          const attendanceId = await moodleClient.ensureAttendanceInstance(
            slot.courseId,
            slot.courseName,
            "Attendance" 
          );

          const sessionDate = new Date(date);
          
          // Use the shared session service
          const result = await createAttendanceSessionFromSchedule(
            attendanceId,
            sessionDate,
            slot.periodIndex,
            3600,
            `Generated Session for Period ${slot.periodIndex + 1}`
          );

          if (result.success) {
            allResults.push({ cohortId, slot, status: 'created', sessionId: result.sessionId });
          } else {
            allResults.push({ cohortId, slot, status: 'failed', error: result.error });
          }
        }
    }

    return NextResponse.json({ success: true, results: allResults });

  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
