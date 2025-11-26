import { NextResponse } from 'next/server';
import { moodleClient } from '@/lib/moodle-client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courseIds } = body;

    if (!courseIds || !Array.isArray(courseIds)) {
      return NextResponse.json(
        { error: 'Missing or invalid courseIds parameter' },
        { status: 400 }
      );
    }

    console.log('[Get Teachers] Request for courseIds:', courseIds);

    // Fetch teachers for all courses
    const teachersMap = await moodleClient.getTeachersForCourses(courseIds);

    return NextResponse.json({
      success: true,
      teachers: teachersMap
    });

  } catch (error: any) {
    console.error('[Get Teachers] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch teachers' },
      { status: 500 }
    );
  }
}
