import { NextResponse } from 'next/server';
import { moodleClient } from '@/lib/moodle-client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courseId, name } = body;

    console.log('[Create Attendance] Request:', { courseId, name });

    if (!courseId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId or name' },
        { status: 400 }
      );
    }

    // Create the attendance instance in Moodle
    const result = await moodleClient.addAttendance(Number(courseId), name);
    
    console.log('[Create Attendance] Moodle API response:', result);

    // Check if result has an ID (could be 'id' or 'attendanceid')
    const instanceId = result.id || result.attendanceid || result.instanceid;
    
    if (!instanceId) {
      console.error('[Create Attendance] No instance ID in response:', result);
      return NextResponse.json(
        { error: 'Failed to get instance ID from Moodle', details: result },
        { status: 500 }
      );
    }

    console.log('[Create Attendance] Success, instanceId:', instanceId);

    return NextResponse.json({
      success: true,
      instanceId: instanceId,
      message: 'Attendance instance created successfully',
    });

  } catch (error: any) {
    console.error('[Create Attendance] Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create attendance instance',
        details: error.response?.data || error.toString()
      },
      { status: 500 }
    );
  }
}
