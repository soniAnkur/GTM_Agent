'use client';

import { useState } from 'react';
import type { Platform, QueuedPost } from '@/lib/types';

type PipelineStep = 'idle' | 'running' | 'done' | 'error';

interface PipelineState {
  research: PipelineStep;
  text: PipelineStep;
  image: PipelineStep;
  save: PipelineStep;
}

export default function GenerateContent() {
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(
    new Set(['twitter', 'facebook', 'instagram']),
  );
  const [includeImage, setIncludeImage] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<QueuedPost[]>([]);
  const [researchSummary, setResearchSummary] = useState('');
  const [error, setError] = useState('');
  const [pipeline, setPipeline] = useState<PipelineState>({
    research: 'idle',
    text: 'idle',
    image: 'idle',
    save: 'idle',
  });

  function togglePlatform(p: Platform) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  async function handleGenerate() {
    if (!topic.trim() || selectedPlatforms.size === 0) return;

    setIsGenerating(true);
    setError('');
    setGeneratedPosts([]);
    setResearchSummary('');
    setPipeline({ research: 'running', text: 'idle', image: 'idle', save: 'idle' });

    try {
      // Simulate pipeline progress via real API call
      setPipeline((p) => ({ ...p, research: 'running' }));

      const res = await fetch('/api/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          context: context.trim() || undefined,
          platforms: Array.from(selectedPlatforms),
          includeImage,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      setPipeline({
        research: 'done',
        text: 'done',
        image: includeImage ? 'done' : 'idle',
        save: 'done',
      });

      setGeneratedPosts(data.posts);
      setResearchSummary(data.researchSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setPipeline((p) => ({
        ...p,
        research: p.research === 'running' ? 'error' : p.research,
        text: p.text === 'running' ? 'error' : p.text,
        image: p.image === 'running' ? 'error' : p.image,
        save: p.save === 'running' ? 'error' : p.save,
      }));
    } finally {
      setIsGenerating(false);
    }
  }

  function getPipelineStatusClass(step: PipelineStep) {
    switch (step) {
      case 'idle':
        return 'pill-pending';
      case 'running':
        return 'pill-generating';
      case 'done':
        return 'pill-published';
      case 'error':
        return 'pill-failed';
    }
  }

  function getPipelineLabel(step: PipelineStep) {
    switch (step) {
      case 'idle':
        return 'Ready';
      case 'running':
        return 'Running...';
      case 'done':
        return 'Done';
      case 'error':
        return 'Failed';
    }
  }

  const previewPost = generatedPosts[0];

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-header-title">Generate Content</div>
          <div className="section-header-sub">
            AI-powered post creation using Gemini + kie.ai
          </div>
        </div>
      </div>

      <div className="generate-layout">
        {/* Left: Form */}
        <div>
          <div className="card-panel" style={{ padding: '22px' }}>
            <div className="form-group">
              <label className="form-label">Topic / Prompt</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Q2 product launch, tips for productivity, customer success story..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Additional Context (optional)</label>
              <textarea
                className="form-textarea"
                placeholder="Add any specific details, links, or angles you want the AI to consider..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                style={{ minHeight: '80px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Platforms</label>
              <div className="platform-toggles">
                <button
                  className={`platform-toggle ${selectedPlatforms.has('twitter') ? 'selected-tw' : ''}`}
                  onClick={() => togglePlatform('twitter')}
                >
                  {'\u{1F426}'} Twitter
                </button>
                <button
                  className={`platform-toggle ${selectedPlatforms.has('facebook') ? 'selected-fb' : ''}`}
                  onClick={() => togglePlatform('facebook')}
                >
                  {'\u{1F4D8}'} Facebook
                </button>
                <button
                  className={`platform-toggle ${selectedPlatforms.has('instagram') ? 'selected-ig' : ''}`}
                  onClick={() => togglePlatform('instagram')}
                >
                  {'\u{1F4F8}'} Instagram
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Include AI Image</label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '4px',
                }}
              >
                <button
                  className={`toggle-switch ${includeImage ? 'on' : ''}`}
                  onClick={() => setIncludeImage(!includeImage)}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                  Generate matching image via kie.ai (~$0.03)
                </span>
              </div>
            </div>

            <button
              className="generate-btn"
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim() || selectedPlatforms.size === 0}
            >
              {isGenerating ? (
                <>
                  <span className="spinner white" /> Generating...
                </>
              ) : (
                <>{'\u{2728}'} Generate with Gemini + kie.ai</>
              )}
            </button>

            {error && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  background: 'rgba(244,63,94,0.1)',
                  border: '1px solid rgba(244,63,94,0.3)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--rose)',
                }}
              >
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div>
          <div className="preview-card">
            <div className="preview-title">Content Preview</div>
            <div className="mock-post">
              <div className="mock-post-header">
                <div className="mock-avatar">B</div>
                <div>
                  <div className="mock-name">Your Brand</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                    {previewPost
                      ? `${previewPost.platform} post`
                      : 'Awaiting generation'}
                  </div>
                </div>
                <div className="mock-time">Just now</div>
              </div>
              <div className="mock-body">
                {previewPost?.content ||
                  'Your AI-generated post content will appear here after clicking Generate.'}
              </div>
              {previewPost?.mediaUrl ? (
                <div className="mock-image">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewPost.mediaUrl} alt="Generated" />
                </div>
              ) : (
                <div className="mock-image">
                  {'\u{1F3A8}'} AI Image {includeImage ? '— will generate' : '— disabled'}
                </div>
              )}
              <div className="mock-actions">
                <span className="mock-action">{'\u{1F501}'} Repost</span>
                <span className="mock-action">{'\u{2764}\u{FE0F}'} Like</span>
                <span className="mock-action">{'\u{1F4AC}'} Reply</span>
              </div>
            </div>

            {!previewPost && !isGenerating && (
              <div style={{ padding: '12px 0 8px' }}>
                <span className="status-pill pill-pending" style={{ fontSize: '11px' }}>
                  <span className="pill-dot" />
                  Awaiting generation — click Generate
                </span>
              </div>
            )}

            {generatedPosts.length > 1 && (
              <div style={{ marginTop: '12px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-3)',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.07em',
                    marginBottom: '8px',
                  }}
                >
                  Also generated for:
                </div>
                {generatedPosts.slice(1).map((post, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#0d0f1e',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      marginBottom: '8px',
                      fontSize: '12px',
                      color: 'var(--text-2)',
                    }}
                  >
                    <span
                      className={`platform-chip ${post.platform === 'twitter' ? 'chip-twitter' : post.platform === 'facebook' ? 'chip-facebook' : 'chip-instagram'}`}
                      style={{ marginRight: '8px' }}
                    >
                      {post.platform}
                    </span>
                    <span style={{ opacity: 0.7 }}>
                      {post.content.slice(0, 80)}...
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pipeline Status */}
          <div className="card-panel mt-16" style={{ padding: '14px 16px' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                marginBottom: '10px',
                color: 'var(--text-2)',
              }}
            >
              AI Pipeline Status
            </div>
            {[
              { icon: '\u{1F50D}', label: 'Google Search grounding', step: pipeline.research },
              { icon: '\u{1F9E0}', label: 'Gemini text generation', step: pipeline.text },
              { icon: '\u{1F3A8}', label: 'kie.ai image generation', step: pipeline.image },
              { icon: '\u{1F5C4}\u{FE0F}', label: 'MongoDB queued_posts', step: pipeline.save },
            ].map((item) => (
              <div key={item.label} className="pipeline-row">
                <span className="pipeline-icon">{item.icon}</span>
                <span className="pipeline-label">{item.label}</span>
                <span
                  className={`status-pill ${getPipelineStatusClass(item.step)}`}
                  style={{ fontSize: '10px' }}
                >
                  {item.step === 'running' ? (
                    <span className="spinner" style={{ width: '10px', height: '10px' }} />
                  ) : (
                    <span className="pill-dot" />
                  )}
                  {getPipelineLabel(item.step)}
                </span>
              </div>
            ))}
          </div>

          {/* Research Summary */}
          {researchSummary && (
            <div className="card-panel mt-16" style={{ padding: '14px 16px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  marginBottom: '10px',
                  color: 'var(--text-2)',
                }}
              >
                Research Summary
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-2)',
                  lineHeight: 1.6,
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                {researchSummary}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
