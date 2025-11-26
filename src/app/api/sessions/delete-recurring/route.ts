import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { recurringSessionId } = body;

    if (!recurringSessionId) {
      return NextResponse.json(
        { error: 'recurringSessionId is required' },
        { status: 400 }
      );
    }

    // Count instances before deleting
    const instanceCount = await prisma.sessionInstance.count({
      where: { recurringSessionId },
    });

    // Delete all session instances with this recurring_session_id
    const deletedInstances = await prisma.sessionInstance.deleteMany({
      where: { recurringSessionId },
    });

    // Delete the recurring session record
    const deletedRecurring = await prisma.recurringSession.delete({
      where: { id: recurringSessionId },
    });

    console.log(`[Delete Recurring] Deleted ${deletedInstances.count} instances and recurring session ${recurringSessionId}`);

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedInstances.count} session instances`,
      deletedCount: deletedInstances.count,
      deletedRecurring,
    });
  } catch (error: any) {
    console.error('[Delete Recurring API]', error);
    
    // Handle not found error
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Recurring session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete recurring session', details: error.message },
      { status: 500 }
    );
  }
}
