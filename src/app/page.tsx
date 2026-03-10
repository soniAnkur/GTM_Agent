'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import DashboardHome from '@/components/DashboardHome';
import GenerateContent from '@/components/GenerateContent';
import ReviewQueue from '@/components/ReviewQueue';

type Page = 'dashboard' | 'generate' | 'queue';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  return (
    <div className="app">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="main">
        <Topbar currentPage={currentPage} onNavigate={setCurrentPage} />
        <div className="content">
          {currentPage === 'dashboard' && <DashboardHome />}
          {currentPage === 'generate' && <GenerateContent />}
          {currentPage === 'queue' && <ReviewQueue />}
        </div>
      </div>
    </div>
  );
}
