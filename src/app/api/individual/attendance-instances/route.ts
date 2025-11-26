import { NextResponse } from 'next/server';
import { moodleClient } from '@/lib/moodle-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const courseName = searchParams.get('courseName');

    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId parameter' }, { status: 400 });
    }

    console.log('[Get Attendance Instances] Fetching for courseId:', courseId);

    // Fetch attendance instances for the course
    let instances = await moodleClient.getAttendanceInstances(Number(courseId));

    // If no instances exist, create one automatically
    if (instances.length === 0) {
      console.log('[Get Attendance Instances] No instances found, creating one...');
      
      try {
        const name = courseName || `Course ${courseId}`;
        const newInstanceId = await moodleClient.ensureAttendanceInstance(
          Number(courseId),
          name,
          'Attendance'
        );

        console.log('[Get Attendance Instances] ✓ Created attendance instance:', newInstanceId);

        // Fetch again to get the newly created instance details
        instances = await moodleClient.getAttendanceInstances(Number(courseId));
      } catch (createError: any) {
        console.error('[Get Attendance Instances] ✗ Failed to create instance:', createError.message);
        // Return empty array if creation fails
        return NextResponse.json([]);
      }
    }

    console.log('[Get Attendance Instances] Found instances:', instances.length);
    return NextResponse.json(instances);

  } catch (error: any) {
    console.error('[Get Attendance Instances] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch attendance instances' },
      { status: 500 }
    );
  }
}
