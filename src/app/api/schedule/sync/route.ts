import { NextResponse } from 'next/server';
import { moodleClient } from '@/lib/moodle-client';
import { prisma } from '@/lib/prisma';

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

          const startTime = new Date(date);
          startTime.setHours(9 + slot.periodIndex, 0, 0, 0);
          
          const sessionData = {
            sessdate: Math.floor(startTime.getTime() / 1000),
            duration: 3600, 
            description: `Generated Session for Period ${slot.periodIndex + 1}`,
          };

          try {
            const session = await moodleClient.addSession(attendanceId, sessionData);
            allResults.push({ cohortId, slot, status: 'created', sessionId: session.id });
          } catch (err: any) {
            console.error(err);
            allResults.push({ cohortId, slot, status: 'failed', error: err.message });
          }
        }
    }

    return NextResponse.json({ success: true, results: allResults });

  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
