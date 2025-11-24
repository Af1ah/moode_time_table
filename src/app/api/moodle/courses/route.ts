import { NextResponse } from 'next/server';
import { moodleClient } from '@/lib/moodle-client';

export async function GET() {
  try {
    const courses = await moodleClient.getCourses();
    return NextResponse.json(courses);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}
