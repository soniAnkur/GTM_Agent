export type Platform = 'twitter' | 'facebook' | 'instagram';

export interface QueuedPost {
  _id?: string;
  platform: Platform;
  content: string;
  mediaUrl?: string;
  scheduledAt: Date;
  status: 'pending' | 'pending_review' | 'published' | 'failed';
  retryCount: number;
  sourceType: 'ai_generated' | 'manual' | 'dashboard';
  topic?: string;
  researchSummary?: string;
  imagePrompt?: string;
  createdAt: Date;
}

export interface PublishedPost {
  _id?: string;
  platformPostId: string;
  platform: Platform;
  content: string;
  mediaUrl?: string;
  publishedAt: Date;
  queuedPostId: string;
}

export interface Comment {
  _id?: string;
  platformCommentId: string;
  platformPostId: string;
  platform: Platform;
  authorId: string;
  authorName?: string;
  text: string;
  createdAt: Date;
  hasBeenReplied: boolean;
  replyText?: string;
  repliedAt?: Date;
}

export interface PostResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export interface CommentResult {
  success: boolean;
  platformReplyId?: string;
  error?: string;
}

export interface RateLimit {
  _id?: string;
  platform: Platform;
  tokens: number;
  capacity: number;
  lastRefill: Date;
}

export interface PollCursor {
  _id?: string;
  platform: Platform;
  platformPostId: string;
  lastCheckedAt: Date;
}

// Dashboard API types
export interface CreatePostRequest {
  topic: string;
  context?: string;
  platforms: Platform[];
  includeImage: boolean;
  scheduledAt?: string;
}

export interface CreatePostResponse {
  success: boolean;
  posts: QueuedPost[];
  researchSummary: string;
  error?: string;
}

export interface ReviewPostRequest {
  postId: string;
  action: 'approve' | 'reject';
  scheduledAt?: string;
}

// Config types
export interface BrandConfig {
  name: string;
  voice: string;
  topics: string[];
  hashtags: {
    default: string[];
    twitter?: string[];
    instagram?: string[];
  };
  avoid: string[];
}

export interface PlatformConfig {
  enabled: boolean;
  maxPostsPerDay: number;
  characterLimit?: number;
}

export interface AppConfig {
  brand: BrandConfig;
  platforms: Record<Platform, PlatformConfig>;
  scheduling: {
    postTimesUTC: string[];
    timezone: string;
  };
  ai: {
    model: string;
    temperature: number;
    replyContextDepth: number;
    skipReplyPatterns: string[];
  };
}
