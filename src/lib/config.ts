import type { AppConfig } from './types';
import configJson from '../../config.json';

export const appConfig: AppConfig = configJson as AppConfig;

export const env = {
  // Twitter/X
  twitterAppKey: process.env.TWITTER_APP_KEY ?? '',
  twitterAppSecret: process.env.TWITTER_APP_SECRET ?? '',
  twitterAccessToken: process.env.TWITTER_ACCESS_TOKEN ?? '',
  twitterAccessSecret: process.env.TWITTER_ACCESS_SECRET ?? '',

  // Facebook / Instagram
  facebookPageId: process.env.FACEBOOK_PAGE_ID ?? '',
  facebookPageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? '',
  facebookAppSecret: process.env.FACEBOOK_APP_SECRET ?? '',
  facebookWebhookVerifyToken: process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ?? '',
  instagramBusinessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ?? '',

  // AI
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  kieAiApiKey: process.env.KIE_AI_API_KEY ?? '',

  // MongoDB
  mongodbUri: process.env.MONGODB_URI ?? '',

  // Vercel
  cronSecret: process.env.CRON_SECRET ?? '',
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
};
