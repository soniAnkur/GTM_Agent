export class PlatformError extends Error {
  constructor(
    public platform: string,
    message: string,
    public statusCode?: number,
  ) {
    super(`[${platform}] ${message}`);
    this.name = 'PlatformError';
  }
}

export class AIError extends Error {
  constructor(
    public service: string,
    message: string,
  ) {
    super(`[${service}] ${message}`);
    this.name = 'AIError';
  }
}

export class RateLimitError extends Error {
  constructor(
    public platform: string,
    public retryAfterMs?: number,
  ) {
    super(`[${platform}] Rate limit exceeded`);
    this.name = 'RateLimitError';
  }
}
