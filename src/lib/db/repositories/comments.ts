import type { Comment } from '../../types';
import { getCollection } from '../collections';

export async function storeComment(
  comment: Omit<Comment, '_id'>,
): Promise<void> {
  const collection = await getCollection('comments');
  await collection.updateOne(
    {
      platformCommentId: comment.platformCommentId,
      platform: comment.platform,
    },
    { $setOnInsert: comment },
    { upsert: true },
  );
}

export async function markCommentReplied(
  platformCommentId: string,
  platform: string,
  replyText: string,
): Promise<void> {
  const collection = await getCollection('comments');
  await collection.updateOne(
    { platformCommentId, platform },
    {
      $set: {
        hasBeenReplied: true,
        replyText,
        repliedAt: new Date(),
      },
    },
  );
}

export async function getCommentsByPost(
  platformPostId: string,
  limit = 10,
): Promise<Comment[]> {
  const collection = await getCollection('comments');
  return collection
    .find({ platformPostId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray() as unknown as Comment[];
}

export async function isCommentProcessed(
  platformCommentId: string,
  platform: string,
): Promise<boolean> {
  const collection = await getCollection('comments');
  const doc = await collection.findOne({ platformCommentId, platform });
  return doc !== null;
}
