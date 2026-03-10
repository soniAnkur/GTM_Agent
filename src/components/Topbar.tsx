'use client';

type Page = 'dashboard' | 'generate' | 'queue';

interface TopbarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const PAGE_META: Record<Page, { title: string; sub: string }> = {
  dashboard: {
    title: 'Dashboard',
    sub: 'GTM Agent \u2014 Autonomous Social Media Manager',
  },
  generate: {
    title: 'Generate Content',
    sub: 'AI-powered post creation using Gemini + kie.ai',
  },
  queue: {
    title: 'Review Queue',
    sub: 'Approve or reject AI-generated posts',
  },
};

export default function Topbar({ currentPage, onNavigate }: TopbarProps) {
  const meta = PAGE_META[currentPage];

  return (
    <div className="topbar">
      <div>
        <div className="topbar-title">{meta.title}</div>
        <span className="topbar-sub">{meta.sub}</span>
      </div>
      <div className="topbar-right">
        <button
          className="topbar-btn primary"
          onClick={() => onNavigate('generate')}
        >
          + New Post
        </button>
      </div>
    </div>
  );
}
