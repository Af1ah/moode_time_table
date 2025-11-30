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

    // Fetch MasterSchedule for these cohorts
    const masterSchedule = await prisma.masterSchedule.findMany({
      where: {
        cohortId: { in: cohortIds },
      },
    });

    return NextResponse.json(masterSchedule);
  } catch (error: any) {
    console.error('[Load Master Schedule API]', error);
    return NextResponse.json(
      { error: 'Failed to fetch master schedule', details: error.message },
      { status: 500 }
    );
  }
}
