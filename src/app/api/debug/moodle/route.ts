import { NextResponse } from 'next/server';
import { moodleClient } from '@/lib/moodle-client';

export async function GET() {
  try {
    const siteInfo = await moodleClient.getSiteInfo(process.env.MOODLE_TOKEN!);
    const userId = siteInfo.userid;
    const todaySessions = await moodleClient.getTodaySessions(userId);
    return NextResponse.json(todaySessions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
