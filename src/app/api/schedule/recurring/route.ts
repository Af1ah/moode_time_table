import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cohortIdsParam = searchParams.get('cohortIds');

    console.log('[Recurring API] GET request for cohorts:', cohortIdsParam);

    if (!cohortIdsParam) {
      return NextResponse.json({ error: 'cohortIds required' }, { status: 400 });
    }

    const cohortIds = cohortIdsParam.split(',').map(Number);
    const today = new Date();

    // Fetch recurring sessions that are currently active
    // (startDate <= today <= endDate)
    const recurringSessions = await prisma.recurringSession.findMany({
      where: {
        cohortId: { in: cohortIds },
        startDate: { lte: today },
        endDate: { gte: today },
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { period: 'asc' },
      ],
    });

    console.log(`[Recurring API] Found ${recurringSessions.length} sessions for cohorts ${cohortIds}`);

    return NextResponse.json(recurringSessions);
  } catch (error: any) {
    console.error('[Recurring Sessions API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recurring sessions', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cohortIds, slots, force } = body;

    console.log('[Recurring API] POST request to save. Cohorts:', cohortIds, 'Force:', force);
    console.log('[Recurring API] Slots count:', slots?.length);

    if (!cohortIds || !slots) {
      return NextResponse.json({ error: 'Missing cohortIds or slots' }, { status: 400 });
    }

    // Check for existing recurring sessions for these cohorts
    const existing = await prisma.recurringSession.findFirst({
      where: {
        cohortId: { in: cohortIds.map(Number) }
      }
    });

    if (existing && !force) {
      console.log('[Recurring API] Existing sessions found, returning warning');
      return NextResponse.json({ 
        warning: true, 
        message: 'Timetable already exists for these cohorts. Overwrite?',
        existing: true 
      });
    }

    // Save logic
    await prisma.$transaction(async (tx) => {
      // Delete existing for these cohorts (Overwrite)
      await tx.recurringSession.deleteMany({
        where: { cohortId: { in: cohortIds.map(Number) } }
      });

      const daysMap: Record<string, number> = { 'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4 };
      const today = new Date();
      const semesterEnd = new Date();
      semesterEnd.setMonth(today.getMonth() + 6); // Default 6 months

      const newSessions = slots
        .filter((s: any) => s.courseId && cohortIds.includes(s.cohortId))
        .map((s: any) => ({
          cohortId: s.cohortId,
          cohortName: s.cohortName || 'Unknown',
          courseId: s.courseId,
          courseName: s.subject || 'Unknown',
          dayOfWeek: daysMap[s.day] ?? 0,
          period: s.period,
          startDate: today,
          endDate: semesterEnd,
          description: 'Regular Class'
        }));

      console.log(`[Recurring API] Saving ${newSessions.length} new sessions`);

      if (newSessions.length > 0) {
        await tx.recurringSession.createMany({
          data: newSessions
        });
      }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Save Recurring API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
