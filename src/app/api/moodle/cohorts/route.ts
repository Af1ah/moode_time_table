import { NextResponse } from 'next/server';
import { moodleClient } from '@/lib/moodle-client';

export async function GET() {
  try {
    // For now, we'll try to fetch categories as a proxy for cohorts
    // If that fails or isn't right, we can adjust.
    // Since we didn't implement getCategories in client yet, let's add it or use raw call here.
    // But better to keep it in client.
    // For this MVP step, let's just return mock data or try to fetch if we add the method.
    // Let's stick to the plan: "Implement Data Fetching".
    
    // Actually, let's try to fetch courses and extract unique categories from them if possible,
    // or just return the courses themselves if the user selects a "Course" as a "Batch".
    // The user said "Select a specific batch... e.g. B.Sc CS Year 1".
    // This sounds like a Category or a specific Course that acts as a container.
    
    // Let's mock it for now to keep UI working, but with a TODO to connect real data.
    // Or better, let's fetch courses and return them, letting the user select a course.
    
    const cohorts = await moodleClient.getCohorts();
    return NextResponse.json(cohorts);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch cohorts' }, { status: 500 });
  }
}
