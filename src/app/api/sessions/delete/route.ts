import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionInstanceId } = body;

    if (!sessionInstanceId) {
      return NextResponse.json(
        { error: 'sessionInstanceId is required' },
        { status: 400 }
      );
    }

    // Delete the session instance
    const deleted = await prisma.sessionInstance.delete({
      where: { id: sessionInstanceId },
    });

    console.log(`[Delete Session] Deleted instance ${sessionInstanceId}`);

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully',
      deleted,
    });
  } catch (error: any) {
    console.error('[Delete Session API]', error);
    
    // Handle not found error
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete session', details: error.message },
      { status: 500 }
    );
  }
}
