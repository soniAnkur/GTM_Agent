import { ObjectId, type Document } from 'mongodb';
import type { QueuedPost, PublishedPost } from '../../types';
import { getCollection } from '../collections';

export async function createQueuedPost(
  post: Omit<QueuedPost, '_id'>,
): Promise<QueuedPost> {
  const collection = await getCollection('queued_posts');
  const doc = { ...post } as unknown as Document;
  const result = await collection.insertOne(doc);
  return { ...post, _id: result.insertedId.toString() };
}

export async function getPendingReviewPosts(): Promise<QueuedPost[]> {
  const collection = await getCollection('queued_posts');
  const docs = await collection
    .find({ status: 'pending_review' })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((d) => ({ ...d, _id: d._id.toString() })) as unknown as QueuedPost[];
}

export async function approvePost(
  postId: string,
  scheduledAt: Date,
): Promise<boolean> {
  const collection = await getCollection('queued_posts');
  const result = await collection.updateOne(
    { _id: new ObjectId(postId), status: 'pending_review' } as unknown as Document,
    { $set: { status: 'pending', scheduledAt } },
  );
  return result.modifiedCount === 1;
}

export async function rejectPost(postId: string): Promise<boolean> {
  const collection = await getCollection('queued_posts');
  const result = await collection.deleteOne({
    _id: new ObjectId(postId),
    status: 'pending_review',
  } as unknown as Document);
  return result.deletedCount === 1;
}

export async function getDuePosts(): Promise<QueuedPost[]> {
  const collection = await getCollection('queued_posts');
  const docs = await collection
    .find({
      status: 'pending',
      scheduledAt: { $lte: new Date() },
    })
    .sort({ scheduledAt: 1 })
    .toArray();
  return docs.map((d) => ({ ...d, _id: d._id.toString() })) as unknown as QueuedPost[];
}

export async function markPostPublished(
  queuedPostId: string,
  platformPostId: string,
): Promise<void> {
  const queuedCollection = await getCollection('queued_posts');
  const publishedCollection = await getCollection('published_posts');

  const post = await queuedCollection.findOne({
    _id: new ObjectId(queuedPostId),
  } as unknown as Document);
  if (!post) return;

  const publishedPost = {
    platformPostId,
    platform: post.platform,
    content: post.content,
    mediaUrl: post.mediaUrl,
    publishedAt: new Date(),
    queuedPostId,
  } as unknown as Document;

  await publishedCollection.insertOne(publishedPost);
  await queuedCollection.updateOne(
    { _id: new ObjectId(queuedPostId) } as unknown as Document,
    { $set: { status: 'published' } },
  );
}

export async function markPostFailed(queuedPostId: string): Promise<void> {
  const collection = await getCollection('queued_posts');
  await collection.updateOne(
    { _id: new ObjectId(queuedPostId) } as unknown as Document,
    { $inc: { retryCount: 1 }, $set: { status: 'failed' } },
  );
}
