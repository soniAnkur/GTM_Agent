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

const PLATFORM_NAMES: Record<Platform, string> = {
  twitter: 'Twitter',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
};

export default function GenerateContent() {
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(
    new Set(['twitter', 'facebook', 'instagram', 'linkedin']),
  );
  const [includeImage, setIncludeImage] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<QueuedPost[]>([]);
  const [researchSummary, setResearchSummary] = useState('');
  const [error, setError] = useState('');
  const [activePlatformTab, setActivePlatformTab] = useState<Platform>('twitter');
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

  async function handleSelectImage(postId: string, imageUrl: string, imagePrompt: string) {
    await fetch('/api/posts/select-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, imageUrl, imagePrompt }),
    });

    setGeneratedPosts((prev) =>
      prev.map((p) =>
        p._id === postId ? { ...p, mediaUrl: imageUrl, imagePrompt } : p,
      ),
    );
  }

  async function handleGenerate() {
    if (!topic.trim() || selectedPlatforms.size === 0) return;

    setIsGenerating(true);
    setError('');
    setGeneratedPosts([]);
    setResearchSummary('');
    setPipeline({ research: 'running', text: 'idle', image: 'idle', save: 'idle' });

    try {
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
      // Set active tab to first platform that was generated
      if (data.posts.length > 0) {
        setActivePlatformTab(data.posts[0].platform);
      }
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
      case 'idle': return 'pill-pending';
      case 'running': return 'pill-generating';
      case 'done': return 'pill-published';
      case 'error': return 'pill-failed';
    }
  }

  function getPipelineLabel(step: PipelineStep) {
    switch (step) {
      case 'idle': return 'Ready';
      case 'running': return 'Running...';
      case 'done': return 'Done';
      case 'error': return 'Failed';
    }
  }

  const activePost = generatedPosts.find((p) => p.platform === activePlatformTab);

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
                {(['twitter', 'facebook', 'instagram', 'linkedin'] as Platform[]).map((p) => (
                  <button
                    key={p}
                    className={`platform-toggle ${selectedPlatforms.has(p) ? (p === 'twitter' ? 'selected-tw' : p === 'facebook' ? 'selected-fb' : p === 'instagram' ? 'selected-ig' : 'selected-li') : ''}`}
                    onClick={() => togglePlatform(p)}
                  >
                    {PLATFORM_NAMES[p]}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Include AI Images</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                <button
                  className={`toggle-switch ${includeImage ? 'on' : ''}`}
                  onClick={() => setIncludeImage(!includeImage)}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                  Generate 3 image options per platform via kie.ai
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
                'Generate with Gemini + kie.ai'
              )}
            </button>

            {error && (
              <div style={{
                marginTop: '12px', padding: '10px 14px',
                background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)',
                borderRadius: '8px', fontSize: '13px', color: 'var(--rose)',
              }}>
                {error}
              </div>
            )}
          </div>

          {/* Pipeline Status */}
          <div className="card-panel mt-16" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-2)' }}>
              AI Pipeline Status
            </div>
            {[
              { label: 'Google Search grounding', step: pipeline.research },
              { label: 'Gemini text generation (per platform)', step: pipeline.text },
              { label: 'kie.ai image generation (3 per platform)', step: pipeline.image },
              { label: 'MongoDB save', step: pipeline.save },
            ].map((item) => (
              <div key={item.label} className="pipeline-row">
                <span className="pipeline-label">{item.label}</span>
                <span className={`status-pill ${getPipelineStatusClass(item.step)}`} style={{ fontSize: '10px' }}>
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
        </div>

        {/* Right: Platform tabs + Preview */}
        <div>
          {generatedPosts.length > 0 ? (
            <>
              {/* Platform tabs */}
              <div className="platform-tabs">
                {generatedPosts.map((post) => (
                  <button
                    key={post.platform}
                    className={`platform-tab ${activePlatformTab === post.platform ? 'active' : ''} ${post.platform === 'twitter' ? 'tab-tw' : post.platform === 'facebook' ? 'tab-fb' : post.platform === 'instagram' ? 'tab-ig' : 'tab-li'}`}
                    onClick={() => setActivePlatformTab(post.platform)}
                  >
                    {PLATFORM_NAMES[post.platform]}
                    {(post.imageCandidates?.length || 0) > 0 && (
                      <span style={{ fontSize: '10px', opacity: 0.7, marginLeft: '4px' }}>
                        ({post.imageCandidates?.length} img)
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Active post preview */}
              {activePost && (
                <div className="preview-card" style={{ borderRadius: '0 0 12px 12px', borderTop: 'none' }}>
                  <div className="mock-post">
                    <div className="mock-post-header">
                      <div className="mock-avatar">B</div>
                      <div>
                        <div className="mock-name">Your Brand</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                          {PLATFORM_NAMES[activePost.platform]} post
                        </div>
                      </div>
                      <div className="mock-time">Just now</div>
                    </div>
                    <div className="mock-body">{activePost.content}</div>
                    {activePost.mediaUrl && (
                      <div className="mock-image" style={{ height: 'auto', aspectRatio: '1/1' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={activePost.mediaUrl} alt="Selected" />
                      </div>
                    )}
                    <div className="mock-actions">
                      <span className="mock-action">Like</span>
                      <span className="mock-action">Comment</span>
                      <span className="mock-action">Share</span>
                    </div>
                  </div>

                  {/* Image candidates picker */}
                  {activePost.imageCandidates && activePost.imageCandidates.length > 0 && (
                    <div style={{ marginTop: '14px' }}>
                      <div style={{
                        fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const,
                        letterSpacing: '0.07em', color: 'var(--text-3)', marginBottom: '10px',
                      }}>
                        Choose image ({activePost.imageCandidates.length} options)
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
                      {/* Show prompt of selected image */}
                      {activePost.imagePrompt && (
                        <div style={{
                          marginTop: '10px', fontSize: '11px', color: 'var(--text-3)',
                          fontStyle: 'italic', lineHeight: 1.5,
                        }}>
                          Prompt: {activePost.imagePrompt}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Char count */}
                  <div style={{
                    marginTop: '12px', fontSize: '11px', color: 'var(--text-3)',
                    display: 'flex', justifyContent: 'space-between',
                  }}>
                    <span>{activePost.content.length} characters</span>
                    <span>
                      {activePost.platform === 'twitter' ? '280 max' : activePost.platform === 'facebook' ? '2,000 max' : activePost.platform === 'instagram' ? '2,200 max' : '3,000 max'}
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="preview-card">
              <div className="preview-title">Content Preview</div>
              <div className="mock-post">
                <div className="mock-post-header">
                  <div className="mock-avatar">B</div>
                  <div>
                    <div className="mock-name">Your Brand</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>Awaiting generation</div>
                  </div>
                </div>
                <div className="mock-body">
                  Your AI-generated post content will appear here after clicking Generate.
                </div>
                <div className="mock-image">
                  AI Image {includeImage ? '-- will generate 3 per platform' : '-- disabled'}
                </div>
              </div>
              {!isGenerating && (
                <div style={{ padding: '12px 0 8px' }}>
                  <span className="status-pill pill-pending" style={{ fontSize: '11px' }}>
                    <span className="pill-dot" />
                    Awaiting generation
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Research Summary */}
          {researchSummary && (
            <div className="card-panel mt-16" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-2)' }}>
                Research Summary
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.6, maxHeight: '200px', overflowY: 'auto' }}>
                {researchSummary}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
