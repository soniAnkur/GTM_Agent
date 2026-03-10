'use client';

export default function DashboardHome() {
  return (
    <div>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-label">Posts Today</div>
          <span className="stat-card-value">0</span>
          <div className="stat-card-delta">System ready</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Pending Review</div>
          <span className="stat-card-value">0</span>
          <div className="stat-card-delta">No posts awaiting review</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Queue Size</div>
          <span className="stat-card-value">0</span>
          <div className="stat-card-delta">No posts queued</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">AI Tokens Used</div>
          <span className="stat-card-value">0</span>
          <div className="stat-card-delta">$0.00 today</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card-panel">
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div className="section-header-title">Cron Job Status</div>
          </div>
          <div style={{ padding: '12px 16px' }}>
            {[
              {
                icon: '\u{1F4E4}',
                name: 'Post Scheduler',
                detail: 'Every 5 min',
              },
              {
                icon: '\u{1F4AC}',
                name: 'Comment Monitor',
                detail: 'Every 3 min',
              },
              {
                icon: '\u{2728}',
                name: 'Content Generator',
                detail: 'Every 4 hrs',
              },
            ].map((cron) => (
              <div
                key={cron.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 0',
                  borderBottom: '1px solid rgba(99,102,241,0.07)',
                }}
              >
                <span style={{ fontSize: '18px' }}>{cron.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>
                    {cron.name}
                  </div>
                  <div className="text-muted">{cron.detail}</div>
                </div>
                <span className="status-pill pill-pending">
                  <span className="pill-dot"></span>Idle
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-panel">
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div className="section-header-title">Platform Health</div>
          </div>
          <div style={{ padding: '12px 16px' }}>
            {[
              { icon: '\u{1F426}', name: 'Twitter / X' },
              { icon: '\u{1F4D8}', name: 'Facebook Pages' },
              { icon: '\u{1F4F8}', name: 'Instagram Business' },
            ].map((platform) => (
              <div
                key={platform.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 0',
                  borderBottom: '1px solid rgba(99,102,241,0.07)',
                }}
              >
                <span style={{ fontSize: '18px' }}>{platform.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>
                    {platform.name}
                  </div>
                  <div className="text-muted">Not configured</div>
                </div>
                <span className="status-pill pill-pending">
                  <span className="pill-dot"></span>Pending
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
