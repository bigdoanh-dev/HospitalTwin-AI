import React from 'react';
import {
  ChevronRight,
  Menu,
  AlertCircle,
  X
} from 'lucide-react';
import { Role } from './model';

interface HeaderProps {
  currentRole: Role;
  onChangeRole: (role: Role) => void;
  notice?: string;
  onClearNotice?: () => void;
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onChangeRole,
  notice,
  onClearNotice,
  onToggleMobileSidebar
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 shrink-0">
      <div className="h-14 px-3 sm:px-6 flex items-center justify-between gap-2 max-w-full">
        {/* Left: Mobile hamburger & Breadcrumb */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="md:hidden text-slate-500 hover:text-slate-800 min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors shrink-0"
              aria-label="Mở danh mục điều hướng"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
          )}

          <nav aria-label="Đường dẫn bài học" className="flex items-center space-x-1.5 text-xs font-medium text-slate-500 min-w-0">
            <span className="hover:text-slate-800 transition-colors hidden sm:inline">Lớp 10</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline shrink-0" aria-hidden="true" />
            <span className="text-slate-800 font-semibold truncate">Toán học</span>
          </nav>
        </div>

        {/* Right: Role Switcher & Avatar */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Native Select Role Switcher with comfortable >=44px touch target on mobile and tablet */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 sm:px-2.5 min-h-[44px] md:min-h-[38px] transition-colors focus-within:ring-2 focus-within:ring-blue-500">
            <label htmlFor="role-select" className="text-slate-500 mr-1.5 font-medium select-none text-[11px] hidden md:inline">
              Vai trò demo:
            </label>
            <select
              id="role-select"
              aria-label="Vai trò demo"
              value={currentRole}
              onChange={(e) => onChangeRole(e.target.value as Role)}
              className="bg-transparent font-semibold text-slate-800 min-h-[44px] md:min-h-[36px] py-2 md:py-1 focus:outline-hidden cursor-pointer text-xs"
            >
              <option value="student">Học sinh</option>
              <option value="teacher">Giáo viên</option>
            </select>
          </div>

          {/* User Avatar */}
          <div
            className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-800 font-bold text-xs flex items-center justify-center select-none shadow-2xs shrink-0"
            title={currentRole === 'student' ? 'Học sinh mẫu' : 'Giáo viên bộ môn'}
            aria-label={currentRole === 'student' ? 'Hồ sơ học sinh' : 'Hồ sơ giáo viên'}
          >
            {currentRole === 'student' ? 'NT' : 'GV'}
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-50 border-b border-amber-200 px-3 sm:px-4 py-2 sm:py-2.5 flex items-start justify-between text-xs text-amber-900 animate-in fade-in duration-150 gap-2 w-full"
        >
          <div className="flex items-start space-x-2 min-w-0 flex-1 py-1">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="font-medium leading-relaxed break-words whitespace-normal text-amber-950 flex-1">
              {notice}
            </p>
          </div>
          {onClearNotice && (
            <button
              type="button"
              onClick={onClearNotice}
              className="text-amber-700 hover:text-amber-950 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-amber-100/70 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 shrink-0 transition-colors"
              aria-label="Đóng thông báo"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </header>
  );
};
