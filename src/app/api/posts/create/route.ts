import { NextRequest, NextResponse } from 'next/server';
import type { CreatePostRequest, Platform, QueuedPost } from '@/lib/types';
import {
  researchTopic,
  generatePostText,
  generateImagePrompt,
} from '@/lib/ai/content-generator';
import { generateImage } from '@/lib/ai/image-generator';
import { createQueuedPost } from '@/lib/db/repositories/posts';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body: CreatePostRequest = await request.json();
    const { topic, context, platforms, includeImage } = body;

    if (!topic || !platforms?.length) {
      return NextResponse.json(
        { success: false, error: 'Topic and platforms are required' },
        { status: 400 },
      );
    }

    // Step 1: Research the topic
    const researchSummary = await researchTopic(topic, context);

    // Step 2: Generate post text for each platform
    const posts: QueuedPost[] = [];

    for (const platform of platforms) {
      const content = await generatePostText(researchSummary, topic, platform);

      // Step 3: Generate image (once, shared across platforms)
      let mediaUrl: string | undefined;
      let imagePrompt: string | undefined;

      if (includeImage && posts.length === 0) {
        imagePrompt = await generateImagePrompt(content, topic);
        const url = await generateImage(imagePrompt);
        if (url) mediaUrl = url;
      } else if (includeImage && posts.length > 0) {
        // Reuse the image from the first post
        mediaUrl = posts[0].mediaUrl;
        imagePrompt = posts[0].imagePrompt;
      }

      const post = await createQueuedPost({
        platform: platform as Platform,
        content,
        mediaUrl,
        scheduledAt: new Date(),
        status: 'pending_review',
        retryCount: 0,
        sourceType: 'dashboard',
        topic,
        researchSummary,
        imagePrompt,
        createdAt: new Date(),
      });

      posts.push(post);
    }

    return NextResponse.json({
      success: true,
      posts,
      researchSummary,
    });
  } catch (error) {
    console.error('Post creation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Post creation failed',
      },
      { status: 500 },
    );
  }
}
