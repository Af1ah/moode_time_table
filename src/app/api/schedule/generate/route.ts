import { NextResponse } from 'next/server';
import { scheduler } from '@/lib/scheduler';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cohortWorkloads, lockedSlots, periodsPerDay, teacherConstraints, courseTeachers } = body;

    if (!cohortWorkloads) {
      return NextResponse.json({ error: 'Missing cohortWorkloads' }, { status: 400 });
    }

    const allGeneratedSlots: any[] = [];

    // Iterate over each cohort and generate its schedule
    for (const [cohortIdStr, workload] of Object.entries(cohortWorkloads)) {
        const cohortId = Number(cohortIdStr);
        
        // Filter locked slots for this cohort
        const cohortLockedSlots = (lockedSlots || []).filter((s: any) => s.cohortId === cohortId);

        // Generate
        const schedule = scheduler.generate({
            lockedSlots: cohortLockedSlots,
            workload: workload as any,
            periodsPerDay: periodsPerDay || 8,
            teacherConstraints,
            courseTeachers,
            existingSlots: allGeneratedSlots // Pass already generated slots for conflict detection
        });

        // Add cohortId to generated slots
        const cohortSchedule = schedule.map(s => ({
            ...s,
            cohortId
        }));

        allGeneratedSlots.push(...cohortSchedule);
    }

    return NextResponse.json({ success: true, schedule: allGeneratedSlots });

  } catch (error: any) {
    console.error('Generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
