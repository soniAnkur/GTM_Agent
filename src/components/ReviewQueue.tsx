'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { QueuedPost, Platform } from '@/lib/types';

const PLATFORM_META: Record<Platform, { color: string; name: string; tabClass: string }> = {
  twitter: { color: '#1da1f2', name: 'Twitter / X', tabClass: 'tab-tw' },
  facebook: { color: '#1877f2', name: 'Facebook', tabClass: 'tab-fb' },
  instagram: { color: '#dc2743', name: 'Instagram', tabClass: 'tab-ig' },
  linkedin: { color: '#0a66c2', name: 'LinkedIn', tabClass: 'tab-li' },
};

const CHAR_LIMITS: Record<Platform, string> = {
  twitter: '280 max',
  facebook: '2,000 max',
  instagram: '2,200 max',
  linkedin: '3,000 max',
};

interface TopicGroup {
  topic: string;
  createdAt: string;
  posts: QueuedPost[];
  platforms: Platform[];
}

export default function ReviewQueue() {
  const [posts, setPosts] = useState<QueuedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Topic-based navigation
  const [selectedTopicIdx, setSelectedTopicIdx] = useState(0);
  const [activePlatform, setActivePlatform] = useState<Platform | null>(null);

  // AI amendment state
  const [textPrompt, setTextPrompt] = useState('');
  const [textAmending, setTextAmending] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageGenerating, setImageGenerating] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/posts/pending');
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts);
      }
    } catch {
      console.error('Failed to fetch pending posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Group posts by topic
  const topicGroups: TopicGroup[] = useMemo(() => {
    const map = new Map<string, QueuedPost[]>();
    for (const post of posts) {
      const key = post.topic || 'Untitled';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(post);
    }
    return Array.from(map.entries()).map(([topic, topicPosts]) => ({
      topic,
      createdAt: topicPosts[0]?.createdAt
        ? new Date(topicPosts[0].createdAt).toLocaleString([], {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })
        : '',
      posts: topicPosts,
      platforms: topicPosts.map((p) => p.platform),
    }));
  }, [posts]);

  // Current active group & post
  const activeGroup = topicGroups[selectedTopicIdx] || null;
  const activePost = activeGroup?.posts.find((p) => p.platform === activePlatform)
    || activeGroup?.posts[0] || null;

  // Auto-select first platform when topic changes
  useEffect(() => {
    if (activeGroup && activeGroup.platforms.length > 0) {
      if (!activePlatform || !activeGroup.platforms.includes(activePlatform)) {
        setActivePlatform(activeGroup.platforms[0]);
      }
    }
  }, [activeGroup, activePlatform]);

  // Reset prompts when switching
  useEffect(() => {
    setTextPrompt('');
    setImagePrompt('');
  }, [selectedTopicIdx, activePlatform]);

  async function handleReview(postId: string, action: 'approve' | 'reject') {
    setActionInProgress(postId);
    try {
      const res = await fetch('/api/posts/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action, scheduledAt: new Date().toISOString() }),
      });
      const data = await res.json();
      if (data.success) {
        setPosts((prev) => prev.filter((p) => p._id !== postId));
      }
    } catch {
      console.error('Review action failed');
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleReviewAll(action: 'approve' | 'reject') {
    if (!activeGroup) return;
    for (const post of activeGroup.posts) {
      await handleReview(post._id!, action);
    }
  }

  async function handleSelectImage(postId: string, imageUrl: string, imagePrompt: string) {
    await fetch('/api/posts/select-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, imageUrl, imagePrompt }),
    });
    setPosts((prev) =>
      prev.map((p) =>
        p._id === postId ? { ...p, mediaUrl: imageUrl, imagePrompt } : p,
      ),
    );
  }

  async function handleAmendText() {
    if (!activePost || !textPrompt.trim()) return;
    setTextAmending(true);
    try {
      const res = await fetch('/api/posts/update-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: activePost._id, prompt: textPrompt.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p._id === activePost._id ? { ...p, content: data.content } : p,
          ),
        );
        setTextPrompt('');
      }
    } catch {
      console.error('Text amendment failed');
    } finally {
      setTextAmending(false);
    }
  }

  async function handleRegenerateImage() {
    if (!activePost || !imagePrompt.trim()) return;
    setImageGenerating(true);
    try {
      const res = await fetch('/api/posts/regenerate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: activePost._id, prompt: imagePrompt.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p._id === activePost._id
              ? { ...p, mediaUrl: data.imageUrl, imagePrompt: imagePrompt.trim(), imageCandidates: data.imageCandidates }
              : p,
          ),
        );
        setImagePrompt('');
      }
    } catch {
      console.error('Image regeneration failed');
    } finally {
      setImageGenerating(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-3)' }}>
        <span className="spinner" style={{ marginRight: '8px' }} />
        Loading pending posts...
      </div>
    );
  }

  if (topicGroups.length === 0) {
    return (
      <div>
        <div className="section-header">
          <div>
            <div className="section-header-title">Review Queue</div>
            <div className="section-header-sub">No posts awaiting review</div>
          </div>
          <button className="topbar-btn" onClick={fetchPosts}>Refresh</button>
        </div>
        <div className="review-empty-state">
          <div className="review-empty-icon">Q</div>
          <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>Queue is empty</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>
            Generate content to populate the review queue.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-header-title">Review Queue</div>
          <div className="section-header-sub">
            {topicGroups.length} topic{topicGroups.length !== 1 ? 's' : ''} / {posts.length} posts awaiting review
          </div>
        </div>
        <button className="topbar-btn" onClick={fetchPosts}>Refresh</button>
      </div>

      <div className="rq-layout">
        {/* ─── Left: Topic list ─── */}
        <div className="rq-topic-list">
          {topicGroups.map((group, idx) => (
            <div
              key={group.topic + idx}
              className={`rq-topic-card ${selectedTopicIdx === idx ? 'active' : ''}`}
              onClick={() => { setSelectedTopicIdx(idx); setActivePlatform(null); }}
            >
              <div className="rq-topic-title">{group.topic}</div>
              <div className="rq-topic-meta">
                <span className="rq-topic-date">{group.createdAt}</span>
                <div className="rq-topic-chips">
                  {group.platforms.map((p) => {
                    const m = PLATFORM_META[p];
                    return (
                      <span
                        key={p}
                        className="rq-platform-dot"
                        style={{ background: m.color }}
                        title={m.name}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Right: Detail panel ─── */}
        {activeGroup && (
          <div className="rq-detail">
            {/* Topic header with bulk actions */}
            <div className="rq-detail-header">
              <div>
                <div className="rq-detail-topic">{activeGroup.topic}</div>
                <div className="rq-detail-sub">{activeGroup.createdAt} -- {activeGroup.posts.length} platform{activeGroup.posts.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="rq-bulk-actions">
                <button
                  className="action-btn approve"
                  onClick={() => handleReviewAll('approve')}
                  disabled={!!actionInProgress}
                >
                  Approve All
                </button>
                <button
                  className="action-btn reject"
                  onClick={() => handleReviewAll('reject')}
                  disabled={!!actionInProgress}
                >
                  Reject All
                </button>
              </div>
            </div>

            {/* Platform tabs */}
            <div className="platform-tabs">
              {activeGroup.posts.map((post) => {
                const meta = PLATFORM_META[post.platform];
                const imgCount = post.imageCandidates?.length || 0;
                return (
                  <button
                    key={post.platform}
                    className={`platform-tab ${activePlatform === post.platform ? 'active' : ''} ${meta.tabClass}`}
                    onClick={() => setActivePlatform(post.platform)}
                  >
                    {meta.name}
                    {imgCount > 0 && (
                      <span style={{ fontSize: '10px', opacity: 0.7, marginLeft: '4px' }}>
                        ({imgCount} img)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active post content */}
            {activePost && (
              <div className="rq-post-panel">
                {/* Social preview */}
                <div className="rq-preview-section">
                  <div className="social-preview-card" style={{ borderColor: `${PLATFORM_META[activePost.platform].color}33` }}>
                    <div className="social-preview-platform" style={{ background: `${PLATFORM_META[activePost.platform].color}15` }}>
                      <span style={{ fontWeight: 700, fontSize: '12px', color: PLATFORM_META[activePost.platform].color }}>
                        {PLATFORM_META[activePost.platform].name}
                      </span>
                      <span className="social-preview-badge">Preview</span>
                    </div>
                    <div className="social-preview-body">
                      <div className="social-preview-header">
                        <div className="social-preview-avatar">B</div>
                        <div>
                          <div className="social-preview-name">Your Brand</div>
                          <div className="social-preview-handle">
                            {activePost.platform === 'twitter' ? '@yourbrand' : activePost.platform === 'linkedin' ? 'Your Brand' : 'Your Brand Page'}
                            {' \u00B7 '}Just now
                          </div>
                        </div>
                      </div>
                      <div className="social-preview-text">{activePost.content}</div>
                      {activePost.mediaUrl && (
                        <div className="social-preview-image">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={activePost.mediaUrl} alt="Generated" />
                        </div>
                      )}
                      <div className="social-preview-actions">
                        <span className="social-action">{activePost.platform === 'linkedin' ? 'React' : 'Like'}</span>
                        <span className="social-action">Comment</span>
                        <span className="social-action">{activePost.platform === 'linkedin' ? 'Repost' : 'Share'}</span>
                      </div>
                    </div>
                    <div className="social-preview-meta">
                      <span>{activePost.content.length} characters</span>
                      <span>{CHAR_LIMITS[activePost.platform]}</span>
                    </div>
                  </div>
                </div>

                {/* ─── Amend text with AI ─── */}
                <div className="rq-amend-section">
                  <div className="rq-amend-label">Amend Text with AI</div>
                  <div className="rq-amend-row">
                    <input
                      type="text"
                      className="rq-amend-input"
                      placeholder="e.g. make it shorter, add a statistic, more professional tone..."
                      value={textPrompt}
                      onChange={(e) => setTextPrompt(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !textAmending) handleAmendText(); }}
                      disabled={textAmending}
                    />
                    <button
                      className="rq-amend-btn"
                      onClick={handleAmendText}
                      disabled={textAmending || !textPrompt.trim()}
                    >
                      {textAmending ? <span className="spinner white" style={{ width: '14px', height: '14px' }} /> : 'Amend'}
                    </button>
                  </div>
                </div>

                {/* ─── Image candidates ─── */}
                {activePost.imageCandidates && activePost.imageCandidates.length > 0 && (
                  <div className="rq-images-section">
                    <div className="rq-amend-label">
                      Images ({activePost.imageCandidates.length} options)
                    </div>
                    <div className="image-candidates">
                      {activePost.imageCandidates.map((candidate, i) => (
                        <div
                          key={i}
                          className={`image-candidate ${activePost.mediaUrl === candidate.url ? 'selected' : ''}`}
                          onClick={() => handleSelectImage(activePost._id!, candidate.url, candidate.prompt)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={candidate.url} alt={`Option ${i + 1}`} />
                          {activePost.mediaUrl === candidate.url && (
                            <div className="image-candidate-check">Selected</div>
                          )}
                        </div>
                      ))}
                    </div>
                    {activePost.imagePrompt && (
                      <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-3)', fontStyle: 'italic', lineHeight: 1.5 }}>
                        Prompt: {activePost.imagePrompt}
                      </div>
                    )}
                  </div>
                )}

                {/* ─── Regenerate image with AI ─── */}
                <div className="rq-amend-section">
                  <div className="rq-amend-label">Generate New Image with AI</div>
                  <div className="rq-amend-row">
                    <input
                      type="text"
                      className="rq-amend-input"
                      placeholder="e.g. professional team meeting in modern office, clean infographic showing growth..."
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !imageGenerating) handleRegenerateImage(); }}
                      disabled={imageGenerating}
                    />
                    <button
                      className="rq-amend-btn"
                      onClick={handleRegenerateImage}
                      disabled={imageGenerating || !imagePrompt.trim()}
                    >
                      {imageGenerating ? <span className="spinner white" style={{ width: '14px', height: '14px' }} /> : 'Generate'}
                    </button>
                  </div>
                  {imageGenerating && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-3)' }}>
                      Generating image... this may take up to 2 minutes.
                    </div>
                  )}
                </div>

                {/* ─── Per-platform actions ─── */}
                <div className="rq-post-actions">
                  <button
                    className="action-btn approve"
                    onClick={() => handleReview(activePost._id!, 'approve')}
                    disabled={actionInProgress === activePost._id}
                  >
                    {actionInProgress === activePost._id ? '...' : `Approve ${PLATFORM_META[activePost.platform].name}`}
                  </button>
                  <button
                    className="action-btn reject"
                    onClick={() => handleReview(activePost._id!, 'reject')}
                    disabled={actionInProgress === activePost._id}
                  >
                    Reject
                  </button>
                </div>

                {/* ─── Research summary (collapsible) ─── */}
                {activePost.researchSummary && (
                  <details className="rq-research">
                    <summary className="rq-research-toggle">Research Summary</summary>
                    <div className="rq-research-body">{activePost.researchSummary}</div>
                  </details>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
