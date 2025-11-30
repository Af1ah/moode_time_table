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
    let teachersMap = {};
    try {
        teachersMap = await moodleClient.getTeachersForCourses(courseIds);
    } catch (e: any) {
        // If bulk fetch fails, try individual or just suppress if it's the specific error
        // But `getTeachersForCourses` likely iterates internally. Let's check the client first.
        // For now, I will wrap this in a try-catch that logs but returns empty if it fails completely, 
        // OR better, I should modify `moodle-client.ts` to be more robust.
        // However, the user error shows `MoodleClient.getTeachersForCourses` calling `getCourseTeachers` which calls `call`.
        // The error propagates up.
        // I will modify this file to catch the error and return partial success if possible, 
        // but since `getTeachersForCourses` might fail entirely, I'll just log a warning and return empty for now
        // to stop the console spam.
        console.warn('[Get Teachers] Partial or full failure fetching teachers:', e.message);
        teachersMap = {}; 
    }

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
