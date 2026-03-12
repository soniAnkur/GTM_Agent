import { NextRequest, NextResponse } from 'next/server';
import type { CreatePostRequest, Platform, QueuedPost, ImageCandidate } from '@/lib/types';
import {
  researchTopic,
  generatePostText,
  generateImagePrompts,
} from '@/lib/ai/content-generator';
import { generateImageCandidates } from '@/lib/ai/image-generator';
import { createQueuedPost } from '@/lib/db/repositories/posts';

export const maxDuration = 120;

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
    console.log('[create] Step 1: Researching topic...');
    const researchSummary = await researchTopic(topic, context);

    // Step 2: Generate post text for each platform (in parallel)
    console.log('[create] Step 2: Generating text for', platforms.length, 'platforms...');
    const textResults = await Promise.all(
      platforms.map(async (platform) => ({
        platform: platform as Platform,
        content: await generatePostText(researchSummary, topic, platform),
      })),
    );

    // Step 3: Generate platform-specific images (3 per platform, in parallel)
    let imagesByPlatform: Record<string, ImageCandidate[]> = {};

    if (includeImage) {
      console.log('[create] Step 3: Generating images per platform...');

      // Generate image prompts per platform (in parallel)
      const promptResults = await Promise.all(
        textResults.map(async ({ platform, content }) => ({
          platform,
          prompts: await generateImagePrompts(content, topic, platform, researchSummary),
        })),
      );

      // Generate all images in parallel across all platforms
      const imageResults = await Promise.all(
        promptResults.map(async ({ platform, prompts }) => ({
          platform,
          candidates: await generateImageCandidates(prompts),
        })),
      );

      for (const { platform, candidates } of imageResults) {
        imagesByPlatform[platform] = candidates;
      }
    }

    // Step 4: Save to DB
    console.log('[create] Step 4: Saving posts...');
    const posts: QueuedPost[] = [];

    for (const { platform, content } of textResults) {
      const candidates = imagesByPlatform[platform] || [];
      const selectedImage = candidates[0]?.url;

      const post = await createQueuedPost({
        platform,
        content,
        mediaUrl: selectedImage,
        imageCandidates: candidates.length > 0 ? candidates : undefined,
        imagePrompt: candidates[0]?.prompt,
        scheduledAt: new Date(),
        status: 'pending_review',
        retryCount: 0,
        sourceType: 'dashboard',
        topic,
        researchSummary,
        createdAt: new Date(),
      });

      posts.push(post);
    }

    console.log('[create] Done. Created', posts.length, 'posts.');
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
