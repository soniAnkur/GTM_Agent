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
    linkedin: { limit: 3000, name: 'LinkedIn' },
  };

  const { limit, name } = platformLimits[platform];
  const hashtags = [
    ...brand.hashtags.default,
    ...(brand.hashtags[platform as 'twitter' | 'instagram' | 'linkedin'] ?? []),
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
- DO NOT use emojis. Write clean, professional text only. No emoji characters whatsoever.
${platform === 'twitter' ? '- Keep it punchy and concise, thread-worthy' : ''}
${platform === 'instagram' ? '- Include a call-to-action' : ''}
${platform === 'facebook' ? '- Slightly longer form, encourage discussion' : ''}
${platform === 'linkedin' ? '- Write in a polite, direct, professional tone suited for LinkedIn\n- Structure with a strong opening hook, clear value proposition, and a thoughtful closing\n- Use line breaks for readability (LinkedIn rewards well-structured posts)\n- Include a professional call-to-action (e.g. share thoughts, connect, learn more)\n- Focus on insights, lessons learned, or actionable takeaways\n- Avoid clickbait or overly casual language' : ''}

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

/**
 * Platform audience context for image generation.
 */
const PLATFORM_IMAGE_CONTEXT: Record<Platform, string> = {
  twitter: `Twitter/X audience: tech-savvy professionals, news junkies, thought leaders.
Images should be bold, high-contrast, editorial-style. Think infographic feel, data visualization aesthetic, or striking photojournalism.
Minimal, punchy visuals that stop the scroll in a fast-moving feed. Landscape or square works best.`,

  facebook: `Facebook audience: broad demographics, families, communities, 25-55 age range.
Images should be warm, relatable, lifestyle-oriented. Think real-world scenarios, people-centric, community feel.
Slightly more detailed and narrative - Facebook users pause and engage with story-telling visuals.`,

  instagram: `Instagram audience: visual-first, design-conscious, younger demographics 18-35.
Images should be highly polished, aesthetically curated, with strong color grading. Think editorial photography,
clean compositions with negative space, trending visual styles. Instagram rewards beautiful, aspirational imagery.`,

  linkedin: `LinkedIn audience: professionals, executives, decision-makers, B2B buyers, career-focused individuals.
Images must be highly descriptive and specific - not abstract or vague. Think clear business scenarios, professional settings,
concrete data visualizations, real-world workplace situations, or detailed industry-specific imagery.
LinkedIn users expect substance over style. Images should directly illustrate the post's key point or data.
Prefer: clean infographic-style visuals, professional photography of real scenarios, detailed diagrams, or industry-specific imagery.
Avoid: generic stock photo vibes, abstract art, overly artistic filters. Be literal and informative.`,
};

/**
 * Generate 3 distinct image prompts for a specific platform,
 * using research context + post content + platform audience insights.
 */
export async function generateImagePrompts(
  postContent: string,
  topic: string,
  platform: Platform,
  research: string,
): Promise<string[]> {
  const ai = getClient();
  const platformContext = PLATFORM_IMAGE_CONTEXT[platform];

  const prompt = `Generate exactly 3 different image prompts for an AI image model (Flux). Each prompt will produce a different image option for the user to choose from.

Topic: ${topic}
Platform: ${platform}
Post content: ${postContent}

Key research points to incorporate visually:
${research.slice(0, 800)}

Platform audience context:
${platformContext}

Rules for EACH prompt:
- Max 40 words per prompt
- No text, words, letters, or numbers in the image
- Tailor the visual style to the platform audience above
- Each prompt should take a DIFFERENT visual angle (e.g. one abstract, one product-focused, one lifestyle)
- Modern, professional, high-quality
- Square 1:1 format

Return EXACTLY 3 prompts, one per line, numbered 1. 2. 3. Nothing else.`;

  const response = await ai.models.generateContent({
    model: appConfig.ai.model,
    contents: prompt,
    config: {
      temperature: 0.9,
    },
  });

  const text = response.text;
  if (!text)
    throw new AIError('Gemini', 'Empty response from image prompt generation');

  // Parse numbered lines
  const prompts = text
    .split('\n')
    .map((line) => line.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter((line) => line.length > 10);

  if (prompts.length < 1) {
    throw new AIError('Gemini', 'Failed to parse image prompts');
  }

  return prompts.slice(0, 3);
}
