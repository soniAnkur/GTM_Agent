import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: Return queued posts
  return NextResponse.json({ posts: [] });
}

export async function POST() {
  // TODO: Manual post queue
  return NextResponse.json({ success: true, message: 'Queue stub' });
}
