import { NextRequest, NextResponse } from 'next/server';
import { ObjectId, type Document } from 'mongodb';
import { getCollection } from '@/lib/db/collections';
import { generateImage } from '@/lib/ai/image-generator';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const { postId, prompt } = await request.json();

    if (!postId || !prompt) {
      return NextResponse.json(
        { success: false, error: 'postId and prompt are required' },
        { status: 400 },
      );
    }

    const collection = await getCollection('queued_posts');
    const post = await collection.findOne({
      _id: new ObjectId(postId),
    } as unknown as Document);

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 },
      );
    }

    console.log('[regenerate-image] Generating image for prompt:', prompt);
    const imageUrl = await generateImage(prompt);

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Image generation failed. Try a simpler prompt.' },
        { status: 500 },
      );
    }

    // Add new image to candidates and set as selected
    const candidates = Array.isArray(post.imageCandidates) ? [...post.imageCandidates] : [];
    candidates.push({ url: imageUrl, prompt });

    await collection.updateOne(
      { _id: new ObjectId(postId) } as unknown as Document,
      {
        $set: {
          mediaUrl: imageUrl,
          imagePrompt: prompt,
          imageCandidates: candidates,
        },
      },
    );

    return NextResponse.json({
      success: true,
      imageUrl,
      imageCandidates: candidates,
    });
  } catch (error) {
    console.error('Regenerate image failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to regenerate image' },
      { status: 500 },
    );
  }
}
