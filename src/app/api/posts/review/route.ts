import { NextRequest, NextResponse } from 'next/server';
import type { ReviewPostRequest } from '@/lib/types';
import { approvePost, rejectPost } from '@/lib/db/repositories/posts';

export async function POST(request: NextRequest) {
  try {
    const body: ReviewPostRequest = await request.json();
    const { postId, action, scheduledAt } = body;

    if (!postId || !action) {
      return NextResponse.json(
        { success: false, error: 'postId and action are required' },
        { status: 400 },
      );
    }

    if (action === 'approve') {
      const scheduleDate = scheduledAt ? new Date(scheduledAt) : new Date();
      const success = await approvePost(postId, scheduleDate);

      if (!success) {
        return NextResponse.json(
          { success: false, error: 'Post not found or not in pending_review' },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, action: 'approved' });
    }

    if (action === 'reject') {
      const success = await rejectPost(postId);

      if (!success) {
        return NextResponse.json(
          { success: false, error: 'Post not found or not in pending_review' },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, action: 'rejected' });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 },
    );
  } catch (error) {
    console.error('Review action failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Review failed',
      },
      { status: 500 },
    );
  }
}
