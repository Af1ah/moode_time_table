import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cohortIdsParam = searchParams.get('cohortIds');

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

    return NextResponse.json(recurringSessions);
  } catch (error: any) {
    console.error('[Recurring Sessions API]', error);
    return NextResponse.json(
      { error: 'Failed to fetch recurring sessions', details: error.message },
      { status: 500 }
    );
  }
}
