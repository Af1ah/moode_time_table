import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cohortIds, slots } = body;

    if (!cohortIds || !Array.isArray(cohortIds) || !slots) {
      return NextResponse.json({ error: 'Missing cohortIds or slots' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (const cohortId of cohortIds) {
          // 1. Clear existing schedule for this cohort
          await tx.masterSchedule.deleteMany({
            where: { cohortId: Number(cohortId) }
          });

          // 2. Filter slots for this cohort
          const cohortSlots = slots.filter((s: any) => s.cohortId === cohortId);

          // 3. Insert new slots
          const daysMap: Record<string, number> = { 'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4 };
          
          const dbSlots = cohortSlots.map((s: any) => ({
            dayOfWeek: daysMap[s.day] ?? 0,
            periodIndex: s.period,
            courseId: s.courseId,
            courseName: s.subject || 'Unknown',
            isLocked: s.isLocked,
            cohortId: Number(cohortId),
            cohortName: 'Unknown', 
          })).filter((s: any) => s.courseId); 

          if (dbSlots.length > 0) {
            await tx.masterSchedule.createMany({
              data: dbSlots
            });
          }
      }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Save error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
