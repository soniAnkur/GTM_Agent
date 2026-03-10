'use client';

import { useState, useEffect, useCallback } from 'react';
import type { QueuedPost, Platform } from '@/lib/types';

const PLATFORM_CHIPS: Record<Platform, { className: string; label: string }> = {
  twitter: { className: 'chip-twitter', label: '\u{1F426} Twitter' },
  facebook: { className: 'chip-facebook', label: '\u{1F4D8} Facebook' },
  instagram: { className: 'chip-instagram', label: '\u{1F4F8} Instagram' },
};

export default function ReviewQueue() {
  const [posts, setPosts] = useState<QueuedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

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

  async function handleReview(postId: string, action: 'approve' | 'reject') {
    setActionInProgress(postId);
    try {
      const res = await fetch('/api/posts/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          action,
          scheduledAt: new Date().toISOString(),
        }),
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

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-header-title">Review Queue</div>
          <div className="section-header-sub">
            {posts.length} posts awaiting review
          </div>
        </div>
        <button className="topbar-btn" onClick={fetchPosts}>
          Refresh
        </button>
      </div>

      <div className="card-panel">
        {loading ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--text-3)',
            }}
          >
            <span className="spinner" style={{ marginRight: '8px' }} />
            Loading pending posts...
          </div>
        ) : posts.length === 0 ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--text-3)',
            }}
          >
            No posts awaiting review. Generate content to get started.
          </div>
        ) : (
          <table className="queue-table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Content</th>
                <th>Topic</th>
                <th>Image</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => {
                const chip = PLATFORM_CHIPS[post.platform];
                return (
                  <tr key={post._id}>
                    <td>
                      <span className={`platform-chip ${chip.className}`}>
                        {chip.label}
                      </span>
                    </td>
                    <td>
                      <div className="post-preview">{post.content}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                        {post.topic || '—'}
                      </span>
                    </td>
                    <td>
                      {post.mediaUrl ? (
                        <span className="status-pill pill-published" style={{ fontSize: '10px' }}>
                          <span className="pill-dot" />
                          Has image
                        </span>
                      ) : (
                        <span className="text-muted">None</span>
                      )}
                    </td>
                    <td className="text-muted">
                      {new Date(post.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="action-btn approve"
                          onClick={() => handleReview(post._id!, 'approve')}
                          disabled={actionInProgress === post._id}
                        >
                          {actionInProgress === post._id ? '...' : 'Approve'}
                        </button>
                        <button
                          className="action-btn reject"
                          onClick={() => handleReview(post._id!, 'reject')}
                          disabled={actionInProgress === post._id}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
