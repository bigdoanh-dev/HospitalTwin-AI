import React, { useState, useEffect } from 'react';
import { useEducationDemo } from './education/useEducationDemo';
import { Sidebar } from './education/Sidebar';
import { Header } from './education/Header';
import { LearnView } from './education/LearnView';
import { AgentsView } from './education/AgentsView';
import { TeacherView } from './education/TeacherView';
import { ResetModal } from './education/ResetModal';

export default function App() {
  const demo = useEducationDemo();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [demo.state.page, demo.state.stage]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased overflow-x-hidden">
      {/* Navigation Sidebar */}
      <Sidebar
        activePage={demo.state.page}
        onSelectPage={demo.actions.setPage}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <Header
          currentRole={demo.state.role}
          onChangeRole={demo.actions.setRole}
          notice={demo.notice}
          onClearNotice={demo.actions.clearNotice}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        {/* Scrollable Page View */}
        <main className="flex-1 p-4 sm:p-6 lg:px-8 lg:py-6 max-w-7xl w-full mx-auto">
          {demo.state.page === 'learn' && (
            <LearnView
              demo={demo}
              onOpenResetModal={() => setIsResetModalOpen(true)}
            />
          )}

          {demo.state.page === 'agents' && (
            <AgentsView demo={demo} />
          )}

          {demo.state.page === 'teacher' && (
            <TeacherView demo={demo} />
          )}

          {/* Honest Footer */}
          <footer className="mt-3 text-center text-xs text-slate-400 font-medium">
            Dữ liệu tổng hợp · Phối hợp tác nhân được mô phỏng · Giáo viên kiểm duyệt trước khi giao bài
          </footer>
        </main>
      </div>

      {/* Reset Confirmation Modal */}
      <ResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={demo.actions.reset}
      />
    </div>
  );
}
