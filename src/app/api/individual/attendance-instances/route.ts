import { NextResponse } from 'next/server';
import { moodleClient } from '@/lib/moodle-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId parameter' }, { status: 400 });
    }

    // Fetch attendance instances for the course
    const instances = await moodleClient.getAttendanceInstances(Number(courseId));

    return NextResponse.json(instances);

  } catch (error: any) {
    console.error('Get attendance instances error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch attendance instances' },
      { status: 500 }
    );
  }
}
