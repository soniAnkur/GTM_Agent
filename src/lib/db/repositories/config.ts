import type { Platform, PollCursor } from '../../types';
import { getCollection } from '../collections';

export async function getPollCursor(
  platform: Platform,
  platformPostId: string,
): Promise<PollCursor | null> {
  const collection = await getCollection('poll_cursors');
  return collection.findOne({
    platform,
    platformPostId,
  }) as unknown as PollCursor | null;
}

export async function updatePollCursor(
  platform: Platform,
  platformPostId: string,
): Promise<void> {
  const collection = await getCollection('poll_cursors');
  await collection.updateOne(
    { platform, platformPostId },
    { $set: { lastCheckedAt: new Date() } },
    { upsert: true },
  );
}

export async function getRateLimit(platform: Platform) {
  const collection = await getCollection('rate_limits');
  return collection.findOne({ platform });
}
