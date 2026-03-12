import { NextRequest, NextResponse } from 'next/server';
import { ObjectId, type Document } from 'mongodb';
import { GoogleGenAI } from '@google/genai';
import { getCollection } from '@/lib/db/collections';
import { env, appConfig } from '@/lib/config';

export const maxDuration = 30;

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

    const ai = new GoogleGenAI({ apiKey: env.geminiApiKey! });

    const platformLimits: Record<string, number> = {
      twitter: 280,
      facebook: 2000,
      instagram: 2200,
      linkedin: 3000,
    };
    const charLimit = platformLimits[post.platform as string] || 2000;

    const aiPrompt = `You are editing a ${post.platform} social media post. Here is the current post:

---
${post.content}
---

The user wants the following change: "${prompt}"

Requirements:
- Apply the requested change while keeping the post suitable for ${post.platform}
- Maximum ${charLimit} characters
- DO NOT use emojis. Write clean, professional text only.
- Return ONLY the updated post text, nothing else. No quotes, no explanation.`;

    const response = await ai.models.generateContent({
      model: appConfig.ai.model,
      contents: aiPrompt,
      config: { temperature: 0.7 },
    });

    const newContent = response.text?.trim();
    if (!newContent) {
      return NextResponse.json(
        { success: false, error: 'AI returned empty response' },
        { status: 500 },
      );
    }

    await collection.updateOne(
      { _id: new ObjectId(postId) } as unknown as Document,
      { $set: { content: newContent } },
    );

    return NextResponse.json({ success: true, content: newContent });
  } catch (error) {
    console.error('Update content failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update content' },
      { status: 500 },
    );
  }
}
