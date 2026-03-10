import type { Platform } from '../types';
import { getCollection } from '../db/collections';

const REFILL_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function consumeToken(platform: Platform): Promise<boolean> {
  const collection = await getCollection('rate_limits');

  const result = await collection.findOneAndUpdate(
    { platform, tokens: { $gt: 0 } },
    { $inc: { tokens: -1 } },
    { returnDocument: 'after' },
  );

  return result !== null;
}

export async function refillTokensIfNeeded(
  platform: Platform,
  capacity: number,
): Promise<void> {
  const collection = await getCollection('rate_limits');
  const now = new Date();

  await collection.updateOne(
    {
      platform,
      lastRefill: { $lt: new Date(now.getTime() - REFILL_INTERVAL_MS) },
    },
    {
      $set: { tokens: capacity, lastRefill: now },
    },
  );
}

export async function initRateLimit(
  platform: Platform,
  capacity: number,
): Promise<void> {
  const collection = await getCollection('rate_limits');

  await collection.updateOne(
    { platform },
    {
      $setOnInsert: {
        platform,
        tokens: capacity,
        capacity,
        lastRefill: new Date(),
      },
    },
    { upsert: true },
  );
}
