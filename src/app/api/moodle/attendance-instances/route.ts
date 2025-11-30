import { NextResponse } from 'next/server';
import { moodleClient } from '@/lib/moodle-client';

export async function POST(request: Request) {
  try {
    const { courseIds } = await request.json();

    if (!courseIds || !Array.isArray(courseIds)) {
      return NextResponse.json({ error: 'Invalid courseIds' }, { status: 400 });
    }

    const results: Record<number, any[]> = {};

    await Promise.all(courseIds.map(async (courseId) => {
      try {
        const instances = await moodleClient.getAttendanceInstances(courseId);
        results[courseId] = instances;
      } catch (error) {
        console.warn(`Failed to fetch attendance instances for course ${courseId}`, error);
        results[courseId] = [];
      }
    }));

    return NextResponse.json({ instances: results });
  } catch (error) {
    console.error('Error fetching attendance instances:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
