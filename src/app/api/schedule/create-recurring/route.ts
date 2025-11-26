import { NextResponse } from 'next/server';
import { createAttendanceSession } from '@/lib/session-service';
import { moodleClient } from '@/lib/moodle-client';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cohortIds, startDate, endDate, slots, mode } = body;

    if (!cohortIds || !startDate || !endDate || !slots) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('[Create Recurring] Request:', {
      cohortIds,
      startDate,
      endDate,
      slotsCount: slots.length,
      mode
    });

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Validate dates
    if (start > end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    let sessionsCreated = 0;
    const createdSessions: any[] = [];
    const errors: string[] = [];

    // Map to store attendance instances by courseId
    const attendanceInstanceMap = new Map<number, number>();

    // For each slot in the timetable
    for (const slot of slots) {
      if (!slot.courseId) continue; // Skip empty slots

      // Ensure attendance instance exists for this course
      if (!attendanceInstanceMap.has(slot.courseId)) {
        try {
          const instances = await moodleClient.getAttendanceInstances(slot.courseId);
          if (instances.length > 0) {
            attendanceInstanceMap.set(slot.courseId, instances[0].instance);
            console.log(`[Create Recurring] Found attendance instance ${instances[0].instance} for course ${slot.courseId}`);
          } else {
            // Create attendance instance if none exists
            const courseName = slot.subject || `Course ${slot.courseId}`;
            const newInstance = await moodleClient.ensureAttendanceInstance(
              slot.courseId,
              courseName,
              'Attendance'
            );
            attendanceInstanceMap.set(slot.courseId, newInstance);
            console.log(`[Create Recurring] Created attendance instance ${newInstance} for course ${slot.courseId}`);
          }
        } catch (error) {
          console.error(`[Create Recurring] Failed to get/create attendance instance for course ${slot.courseId}:`, error);
          errors.push(`Failed to setup attendance for ${slot.subject || slot.courseId}`);
          continue;
        }
      }

      const attendanceId = attendanceInstanceMap.get(slot.courseId);
      if (!attendanceId) continue;

      // Calculate all dates between start and end that match this slot's day
      const dayOfWeek = slot.day; // 0-4 (Mon-Fri) or day name
      let dayIndex: number;
      
      // Convert day to index if it's a string
      if (typeof dayOfWeek === 'string') {
        const dayMap: Record<string, number> = {
          'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4
        };
        dayIndex = dayMap[dayOfWeek] ?? 0;
      } else {
        dayIndex = dayOfWeek;
      }

      const currentDate = new Date(start);

      while (currentDate <= end) {
        // Check if current date's day matches the slot's day
        const currentDayOfWeek = currentDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const adjustedDay = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1; // Convert to 0=Mon

        if (adjustedDay === dayIndex) {
          // Check if session instance already exists for this date/period/course/cohort
          const existingInstance = await prisma.sessionInstance.findFirst({
            where: {
              cohortId: slot.cohortId,
              courseId: slot.courseId,
              sessionDate: currentDate,
              period: slot.period || 0,
            }
          });

          if (existingInstance) {
            console.log(`[Create Recurring] ⊘ Skipping duplicate session for ${slot.subject} on ${currentDate.toISOString().split('T')[0]}`);
            // Skip this date - session already created
            currentDate.setDate(currentDate.getDate() + 1);
            continue;
          }

          try {
            // Create session in Moodle using the session service
            const periodStartHour = 9 + (slot.period || 0);
            
            const result = await createAttendanceSession({
              attendanceId: attendanceId,
              date: currentDate.toISOString().split('T')[0],
              time: `${periodStartHour.toString().padStart(2, '0')}:00`,
              duration: 60, // 1 hour default
              description: 'regular class'
            });

            if (result.success) {
              sessionsCreated++;
              console.log(`[Create Recurring] ✓ Created session for ${slot.subject} on ${currentDate.toISOString().split('T')[0]}`);

              // Store recurring session in database (first time only - not for each date)
              let recurringSessionId: string | null = null;
              
              // Check if we already created a recurring session record for this slot
              const existingRecurring = await prisma.recurringSession.findFirst({
                where: {
                  cohortId: slot.cohortId,
                  courseId: slot.courseId,
                  dayOfWeek: dayIndex,
                  period: slot.period || 0,
                  startDate: start,
                  endDate: end,
                }
              });

              if (existingRecurring) {
                recurringSessionId = existingRecurring.id;
              } else {
                // Create new recurring session record
                try {
                  const recurring = await prisma.recurringSession.create({
                    data: {
                      cohortId: slot.cohortId,
                      cohortName: slot.cohortName || 'Unknown',
                      courseId: slot.courseId,
                      courseName: slot.subject || 'Unknown',
                      dayOfWeek: dayIndex,
                      period: slot.period || 0,
                      startDate: start,
                      endDate: end,
                      description: 'regular class'
                    }
                  });
                  recurringSessionId = recurring.id;
                  console.log(`[Create Recurring] ✓ Created recurring session record`);
                } catch (dbError: any) {
                  console.error(`[Create Recurring] ✗ DB Error creating recurring session:`, dbError.message);
                }
              }

              // Record this specific session instance
              try {
                await prisma.sessionInstance.create({
                  data: {
                    recurringSessionId: recurringSessionId,
                    cohortId: slot.cohortId,
                    courseId: slot.courseId,
                    sessionDate: currentDate,
                    period: slot.period || 0,
                    moodleSessionId: null, // We don't get session ID back from Moodle API currently
                  }
                });
                console.log(`[Create Recurring] ✓ Recorded session instance for ${currentDate.toISOString().split('T')[0]}`);
              } catch (dbError: any) {
                console.error(`[Create Recurring] ✗ DB Error recording instance:`, dbError.message);
                // Continue - session was created in Moodle even if DB insert fails
              }

              createdSessions.push({
                date: currentDate.toISOString().split('T')[0],
                course: slot.subject,
                cohort: slot.cohortName
              });
            } else {
              console.error(`[Create Recurring] ✗ Failed session for ${slot.subject} on ${currentDate.toISOString().split('T')[0]}: ${result.error}`);
              errors.push(`Failed to create session for ${slot.subject} on ${currentDate.toISOString().split('T')[0]}: ${result.error}`);
            }
          } catch (error: any) {
            console.error('[Create Recurring] Error creating session:', error);
            errors.push(`Error: ${error.message}`);
          }
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    console.log('[Create Recurring] Completed:', {
      sessionsCreated,
      errorsCount: errors.length
    });

    return NextResponse.json({
      success: true,
      sessionsCreated,
      createdSessions: createdSessions.slice(0, 10), // Return first 10 for display
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined
    });

  } catch (error: any) {
    console.error('[Create Recurring] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create recurring sessions' },
      { status: 500 }
    );
  }
}
