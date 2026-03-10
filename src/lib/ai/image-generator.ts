import axios from 'axios';
import { env } from '../config';

const KIE_API_BASE = 'https://api.kie.ai/api/v1';
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_TIME_MS = 90000;

interface GenerateResponse {
  taskId: string;
}

interface RecordInfoResponse {
  successFlag: number;
  progress?: string;
  result_urls?: string[];
}

export async function generateImage(prompt: string): Promise<string | null> {
  if (!env.kieAiApiKey) {
    console.warn('KIE_AI_API_KEY not set — skipping image generation');
    return null;
  }

  try {
    const generateRes = await axios.post<GenerateResponse>(
      `${KIE_API_BASE}/gpt4o-image/generate`,
      {
        prompt,
        size: '1:1',
      },
      {
        headers: {
          Authorization: `Bearer ${env.kieAiApiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const { taskId } = generateRes.data;
    if (!taskId) {
      console.error('kie.ai: No taskId returned');
      return null;
    }

    // Poll for completion
    const startTime = Date.now();
    while (Date.now() - startTime < MAX_POLL_TIME_MS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const pollRes = await axios.get<RecordInfoResponse>(
        `${KIE_API_BASE}/record-info`,
        {
          params: { taskId },
          headers: {
            Authorization: `Bearer ${env.kieAiApiKey}`,
          },
        },
      );

      if (
        pollRes.data.successFlag === 1 &&
        pollRes.data.result_urls?.length
      ) {
        return pollRes.data.result_urls[0];
      }
    }

    console.warn('kie.ai: Image generation timed out');
    return null;
  } catch (error) {
    console.error('kie.ai: Image generation failed', error);
    return null;
  }
}
