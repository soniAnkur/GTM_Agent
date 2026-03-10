import { NextResponse } from 'next/server';
import { getPendingReviewPosts } from '@/lib/db/repositories/posts';

export async function GET() {
  try {
    const posts = await getPendingReviewPosts();
    return NextResponse.json({ success: true, posts });
  } catch (error) {
    console.error('Failed to fetch pending posts:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch pending posts',
        posts: [],
      },
      { status: 500 },
    );
  }
}
