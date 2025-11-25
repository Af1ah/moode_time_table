import { NextResponse } from 'next/server';
import { createAttendanceSession } from '@/lib/session-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attendanceId, date, time, duration, description } = body;

    // Validate required fields
    if (!attendanceId || !date || !time) {
      return NextResponse.json(
        { error: 'Missing required fields: attendanceId, date, or time' },
        { status: 400 }
      );
    }

    // Use the shared session service
    const result = await createAttendanceSession({
      attendanceId: Number(attendanceId),
      date,
      time,
      duration: duration || 60,
      description: description || 'Individual Session',
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to create session',
          details: result.details || null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Session created successfully',
      sessionId: result.sessionId,
      attendanceId,
      sessionData: {
        date,
        time,
        duration: `${duration || 60} minutes`,
      },
    });

  } catch (error: any) {
    console.error('Create session error:', error);
    
    return NextResponse.json(
      {
        error: error.message || 'Failed to create session',
        details: error.response?.data || null,
      },
      { status: 500 }
    );
  }
}
