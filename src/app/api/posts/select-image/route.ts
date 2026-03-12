import { NextRequest, NextResponse } from 'next/server';
import { ObjectId, type Document } from 'mongodb';
import { getCollection } from '@/lib/db/collections';

export async function POST(request: NextRequest) {
  try {
    const { postId, imageUrl, imagePrompt } = await request.json();

    if (!postId || !imageUrl) {
      return NextResponse.json(
        { success: false, error: 'postId and imageUrl are required' },
        { status: 400 },
      );
    }

    const collection = await getCollection('queued_posts');
    const result = await collection.updateOne(
      { _id: new ObjectId(postId) } as unknown as Document,
      { $set: { mediaUrl: imageUrl, imagePrompt: imagePrompt || undefined } },
    );

    return NextResponse.json({
      success: result.modifiedCount === 1,
    });
  } catch (error) {
    console.error('Select image failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update image' },
      { status: 500 },
    );
  }
}
