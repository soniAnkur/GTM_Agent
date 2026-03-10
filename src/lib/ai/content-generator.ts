import { GoogleGenAI } from '@google/genai';
import { env, appConfig } from '../config';
import type { Platform } from '../types';
import { AIError } from '../utils/errors';

function getClient() {
  if (!env.geminiApiKey) throw new AIError('Gemini', 'GEMINI_API_KEY not set');
  return new GoogleGenAI({ apiKey: env.geminiApiKey });
}

export async function researchTopic(
  topic: string,
  context?: string,
): Promise<string> {
  const ai = getClient();

  const prompt = `Research the following topic for a social media post. Provide a concise summary of the latest, most relevant information.

Topic: ${topic}
${context ? `Additional context: ${context}` : ''}

Return a structured research summary with:
- Key facts and statistics (with sources where possible)
- Current trends related to this topic
- Angles that would work well for social media engagement
- Any recent news or developments

Keep the summary under 500 words.`;

  const response = await ai.models.generateContent({
    model: appConfig.ai.model,
    contents: prompt,
    config: {
      temperature: 0.3,
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text;
  if (!text) throw new AIError('Gemini', 'Empty response from research');
  return text;
}

export async function generatePostText(
  research: string,
  topic: string,
  platform: Platform,
): Promise<string> {
  const ai = getClient();
  const brand = appConfig.brand;

  const platformLimits: Record<Platform, { limit: number; name: string }> = {
    twitter: { limit: 280, name: 'Twitter/X' },
    facebook: { limit: 2000, name: 'Facebook' },
    instagram: { limit: 2200, name: 'Instagram' },
  };

  const { limit, name } = platformLimits[platform];
  const hashtags = [
    ...brand.hashtags.default,
    ...(brand.hashtags[platform as 'twitter' | 'instagram'] ?? []),
  ].join(' ');

  const prompt = `You are a social media content writer for "${brand.name}".
Brand voice: ${brand.voice}
Topics to avoid: ${brand.avoid.join(', ')}

Write a single ${name} post based on the following research.

Research summary:
${research}

Topic: ${topic}

Requirements:
- Maximum ${limit} characters
- Include relevant hashtags: ${hashtags}
- Write in the brand voice described above
- Make it engaging and shareable
- Platform: ${name}
${platform === 'twitter' ? '- Keep it punchy and concise, thread-worthy' : ''}
${platform === 'instagram' ? '- Include a call-to-action and use emoji appropriately' : ''}
${platform === 'facebook' ? '- Slightly longer form, encourage discussion' : ''}

Return ONLY the post text, nothing else.`;

  const response = await ai.models.generateContent({
    model: appConfig.ai.model,
    contents: prompt,
    config: {
      temperature: 0.7,
    },
  });

  const text = response.text;
  if (!text)
    throw new AIError('Gemini', 'Empty response from text generation');
  return text.trim();
}

export async function generateImagePrompt(
  postContent: string,
  topic: string,
): Promise<string> {
  const ai = getClient();

  const prompt = `Generate an image generation prompt for kie.ai based on this social media post.

Post content: ${postContent}
Topic: ${topic}

Requirements for the prompt:
- Describe a professional, visually striking image
- Square format (1:1 aspect ratio)
- NO text or words in the image
- Modern, clean aesthetic
- Good for social media
- Be specific about colors, composition, and style

Return ONLY the image prompt, nothing else.`;

  const response = await ai.models.generateContent({
    model: appConfig.ai.model,
    contents: prompt,
    config: {
      temperature: 0.7,
    },
  });

  const text = response.text;
  if (!text)
    throw new AIError('Gemini', 'Empty response from image prompt generation');
  return text.trim();
}
