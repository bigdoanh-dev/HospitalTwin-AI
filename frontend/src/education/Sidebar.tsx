import React from 'react';
import { useDialogFocus } from './useDialogFocus';
import {
  BookOpen,
  Bot,
  Users,
  FlaskConical,
  X
} from 'lucide-react';
import { Page } from './model';

interface SidebarProps {
  activePage: Page;
  onSelectPage: (page: Page) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const mobilePanel = useDialogFocus(isOpenMobile, () => onCloseMobile?.());
  const navItems: Array<{ id: Page; label: string; icon: React.ElementType }> = [
    { id: 'learn', label: 'Học tập', icon: BookOpen },
    { id: 'agents', label: 'Tác nhân AI', icon: Bot },
    { id: 'teacher', label: 'Giáo viên', icon: Users },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/90 text-slate-900 w-[214px] sm:w-[224px] max-w-[calc(100vw-3rem)]">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <BookOpen className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-[17px] text-slate-950 tracking-tight leading-none">
              EduAgents
            </div>
            <div className="hidden md:block text-[10px] text-slate-400 font-medium mt-1 leading-normal break-words">
              Học cùng AI, giáo viên đồng hành
            </div>
          </div>
        </div>

        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Đóng danh mục điều hướng"
            className="md:hidden text-slate-400 hover:text-slate-600 min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-lg hover:bg-slate-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                onSelectPage(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center space-x-3 px-3 min-h-[44px] md:min-h-[40px] py-2.5 md:py-2 rounded-xl text-[13px] font-semibold transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer / Badge */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-medium">
          <FlaskConical className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <span className="truncate">Bản trình diễn nghiên cứu</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div ref={mobilePanel} role="dialog" aria-modal="true" aria-label="Danh mục giáo dục" className="relative z-10 h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
