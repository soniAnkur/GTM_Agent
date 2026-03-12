import { env } from '../config';
import { downloadAndUploadToR2 } from '../storage/r2';
import type { ImageCandidate } from '../types';

const KIE_API_BASE = 'https://api.kie.ai/api/v1';
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_TIME_MS = 120000;

/**
 * Generate a single image: try Flux first, fall back to GPT-4o.
 */
export async function generateImage(prompt: string): Promise<string | null> {
  if (!env.kieAiApiKey) {
    console.warn('KIE_AI_API_KEY not set — skipping image generation');
    return null;
  }

  const fluxResult = await tryFluxGeneration(prompt);
  if (fluxResult) return fluxResult;

  console.log('kie.ai: Flux failed, trying GPT-4o fallback...');
  const gpt4oResult = await tryGpt4oGeneration(prompt);
  if (gpt4oResult) return gpt4oResult;

  console.error('kie.ai: All image generation methods failed');
  return null;
}

/**
 * Generate multiple images from an array of prompts (in parallel).
 * Returns successfully generated candidates; failed ones are skipped.
 */
export async function generateImageCandidates(
  prompts: string[],
): Promise<ImageCandidate[]> {
  if (!env.kieAiApiKey) {
    console.warn('KIE_AI_API_KEY not set — skipping image generation');
    return [];
  }

  // Fire all tasks in parallel
  const taskIds: { taskId: string; prompt: string }[] = [];

  await Promise.all(
    prompts.map(async (prompt) => {
      const taskId = await createFluxTask(prompt);
      if (taskId) {
        taskIds.push({ taskId, prompt });
      }
    }),
  );

  if (taskIds.length === 0) return [];

  // Poll all tasks in parallel
  const results = await Promise.all(
    taskIds.map(async ({ taskId, prompt }) => {
      const url = await pollJobsApi(taskId);
      if (url) return { url, prompt } as ImageCandidate;
      return null;
    }),
  );

  return results.filter((r): r is ImageCandidate => r !== null);
}

async function createFluxTask(prompt: string): Promise<string | null> {
  try {
    const res = await fetch(`${KIE_API_BASE}/jobs/createTask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.kieAiApiKey}`,
      },
      body: JSON.stringify({
        model: 'flux-2/flex-text-to-image',
        input: {
          prompt,
          aspect_ratio: '1:1',
          resolution: '1K',
        },
      }),
    });

    if (!res.ok) {
      console.error('kie.ai Flux: Task creation failed:', await res.text());
      return null;
    }

    const data = await res.json();
    console.log('kie.ai Flux task created:', data.data?.taskId);

    if (data.code !== 200 && data.code !== 0) {
      console.error('kie.ai Flux: Task error:', data.msg);
      return null;
    }

    return data.data?.taskId || data.taskId || data.data?.recordId || null;
  } catch (error) {
    console.error('kie.ai Flux: Task creation error', error);
    return null;
  }
}

async function tryFluxGeneration(prompt: string): Promise<string | null> {
  const taskId = await createFluxTask(prompt);
  if (!taskId) return null;
  return pollJobsApi(taskId);
}

async function tryGpt4oGeneration(prompt: string): Promise<string | null> {
  try {
    const createRes = await fetch(`${KIE_API_BASE}/gpt4o-image/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.kieAiApiKey}`,
      },
      body: JSON.stringify({
        prompt,
        size: '1:1',
        nVariants: 1,
      }),
    });

    if (!createRes.ok) return null;

    const createData = await createRes.json();
    const taskId =
      createData.data?.taskId || createData.taskId || createData.data?.recordId;
    if (!taskId) return null;

    const startTime = Date.now();
    while (Date.now() - startTime < MAX_POLL_TIME_MS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const pollRes = await fetch(
        `${KIE_API_BASE}/gpt4o-image/record-info?taskId=${taskId}`,
        { headers: { Authorization: `Bearer ${env.kieAiApiKey}` } },
      );

      if (!pollRes.ok) continue;
      const pollData = await pollRes.json();
      const status = pollData.data?.status;

      if (status === 'FAILED' || status === 'failed') return null;

      if (status === 'SUCCESS' || status === 'success') {
        const urls = pollData.data?.response?.resultUrls;
        if (urls?.length) return persistToR2(urls[0], taskId);
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function pollJobsApi(taskId: string): Promise<string | null> {
  const startTime = Date.now();
  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const pollRes = await fetch(
      `${KIE_API_BASE}/jobs/recordInfo?taskId=${taskId}`,
      { headers: { Authorization: `Bearer ${env.kieAiApiKey}` } },
    );

    if (!pollRes.ok) continue;

    const pollData = await pollRes.json();
    const state = pollData.data?.state;

    if (state === 'failed' || state === 'fail' || pollData.data?.failCode) {
      console.error('kie.ai poll failed:', pollData.data?.failMsg);
      return null;
    }

    if (state === 'success' && pollData.data?.resultJson) {
      let result = pollData.data.resultJson;
      if (typeof result === 'string') result = JSON.parse(result);

      const imageUrl =
        result?.resultUrls?.[0] ||
        result?.images?.[0]?.url ||
        result?.image_url ||
        result?.output?.[0];

      if (!imageUrl) return null;
      return persistToR2(imageUrl, taskId);
    }
  }

  console.warn('kie.ai poll timed out for task:', taskId);
  return null;
}

async function persistToR2(
  imageUrl: string,
  taskId: string,
): Promise<string> {
  try {
    const filename = `gtm-agent/images/${taskId}-${Date.now()}.png`;
    const r2Url = await downloadAndUploadToR2(imageUrl, filename, 'image/png');
    console.log('Image persisted to R2:', r2Url);
    return r2Url;
  } catch (r2Error) {
    console.warn('R2 upload failed, using original URL:', r2Error);
    return imageUrl;
  }
}
