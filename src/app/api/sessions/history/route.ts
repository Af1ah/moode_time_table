import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cohortId = searchParams.get('cohortId');

    // Build where clause
    const where: any = {};
    if (cohortId) {
      where.cohortId = parseInt(cohortId);
    }

    // Fetch all session instances with recurring session data
    const sessionInstances = await prisma.sessionInstance.findMany({
      where,
      orderBy: [
        { sessionDate: 'desc' },
        { period: 'asc' },
      ],
    });

    // Fetch all recurring sessions
    const recurringSessions = await prisma.recurringSession.findMany({
      where: cohortId ? { cohortId: parseInt(cohortId) } : {},
    });

    // Group instances by recurring_session_id
    const recurringGroups: Record<string, any> = {};
    const individualSessions: any[] = [];

    for (const instance of sessionInstances) {
      if (instance.recurringSessionId) {
        if (!recurringGroups[instance.recurringSessionId]) {
          const recurring = recurringSessions.find(
            r => r.id === instance.recurringSessionId
          );
          
          if (recurring) {
            recurringGroups[instance.recurringSessionId] = {
              recurringSessionId: instance.recurringSessionId,
              courseName: recurring.courseName,
              cohortName: recurring.cohortName,
              courseId: recurring.courseId,
              cohortId: recurring.cohortId,
              dayOfWeek: recurring.dayOfWeek,
              period: recurring.period,
              startDate: recurring.startDate,
              endDate: recurring.endDate,
              instances: [],
              instanceCount: 0,
            };
          }
        }
        
        if (recurringGroups[instance.recurringSessionId]) {
          recurringGroups[instance.recurringSessionId].instances.push(instance);
          recurringGroups[instance.recurringSessionId].instanceCount++;
        }
      } else {
        // Individual session (not part of recurring group)
        individualSessions.push(instance);
      }
    }

    const recurringArray = Object.values(recurringGroups);

    return NextResponse.json({
      recurringSessions: recurringArray,
      individualSessions,
      totalSessions: sessionInstances.length,
    });
  } catch (error: any) {
    console.error('[Session History API]', error);
    return NextResponse.json(
      { error: 'Failed to fetch session history', details: error.message },
      { status: 500 }
    );
  }
}
