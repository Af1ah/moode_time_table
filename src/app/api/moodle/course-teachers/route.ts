import { NextResponse } from 'next/server';
import { moodleClient } from '@/lib/moodle-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId parameter' }, { status: 400 });
    }

    console.log('[Get Course Teachers] Request for courseId:', courseId);

    // Fetch teachers for the course
    const teachers = await moodleClient.getCourseTeachers(Number(courseId));

    console.log('[Get Course Teachers] Found teachers:', teachers);

    return NextResponse.json(teachers);

  } catch (error: any) {
    console.error('[Get Course Teachers] Error:', error);
    
    // If it's a permission error, return empty array instead of error
    if (error.message && error.message.includes('Access control exception')) {
      console.warn('[Get Course Teachers] Permission denied - returning empty array');
      return NextResponse.json([]);
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch course teachers' },
      { status: 500 }
    );
  }
}
