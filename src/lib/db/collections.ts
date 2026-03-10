import type { Document } from 'mongodb';
import { getClientPromise } from './client';

const DB_NAME = 'gtm_agent';

type CollectionName =
  | 'queued_posts'
  | 'published_posts'
  | 'comments'
  | 'rate_limits'
  | 'poll_cursors';

export async function getCollection<T extends Document = Document>(
  name: CollectionName,
) {
  const client = await getClientPromise();
  return client.db(DB_NAME).collection<T>(name);
}

export async function ensureIndexes(): Promise<void> {
  const client = await getClientPromise();
  const db = client.db(DB_NAME);

  await db
    .collection('queued_posts')
    .createIndex({ status: 1, scheduledAt: 1 });

  await db
    .collection('published_posts')
    .createIndex({ platform: 1, publishedAt: -1 });

  await db
    .collection('comments')
    .createIndex({ platformCommentId: 1, platform: 1 }, { unique: true });

  await db
    .collection('poll_cursors')
    .createIndex({ platform: 1, platformPostId: 1 }, { unique: true });
}
