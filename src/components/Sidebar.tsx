'use client';

type Page = 'dashboard' | 'generate' | 'queue';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { id: Page; icon: string; label: string }[] = [
  { id: 'dashboard', icon: '\u{1F4CA}', label: 'Dashboard' },
  { id: 'generate', icon: '\u{2728}', label: 'Generate Content' },
  { id: 'queue', icon: '\u{1F4CB}', label: 'Review Queue' },
];

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">{'\u{1F916}'}</div>
        <div className="logo-text">GTM Agent</div>
        <div className="logo-badge">Live</div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Main</div>
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-item-icon">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="system-status">
          <div className="status-dot-wrap">
            <div className="status-dot-ping"></div>
            <div className="status-dot"></div>
          </div>
          All systems operational
        </div>
      </div>
    </aside>
  );
}
