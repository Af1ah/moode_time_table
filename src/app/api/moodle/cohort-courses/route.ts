import { NextResponse } from 'next/server';
import { moodleClient } from '@/lib/moodle-client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cohortId = searchParams.get('cohortId');

  if (!cohortId) {
    return NextResponse.json({ error: 'Cohort ID is required' }, { status: 400 });
  }

  try {
    // 1. Get members of the cohort
    const membersData = await moodleClient.getCohortMembers(Number(cohortId));
    
    // Moodle returns { cohortid: X, userids: [1, 2, 3] } or array of such objects if multiple cohorts requested
    // Since we requested one, it should be the first element or the object itself depending on API version/response structure.
    // Let's handle both.
    let userIds: number[] = [];
    if (Array.isArray(membersData) && membersData.length > 0) {
        userIds = membersData[0].userids;
    } else if (membersData.userids) {
        userIds = membersData.userids;
    }

    if (!userIds || userIds.length === 0) {
        return NextResponse.json([]); // No members, no courses
    }

    // 2. Pick the first user (heuristic)
    const firstUserId = userIds[0];

    // 3. Get courses for that user
    const courses = await moodleClient.getUserCourses(firstUserId);

    return NextResponse.json(courses);
  } catch (error) {
    console.error('Error fetching cohort courses:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}
