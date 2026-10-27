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
      <div className="h-14 px-4 sm:px-6 flex items-center justify-between">
        {/* Left: Mobile hamburger & Breadcrumb */}
        <div className="flex items-center space-x-3">
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="md:hidden text-slate-500 hover:text-slate-800 p-1.5 rounded-lg border border-slate-200"
              aria-label="Mở danh mục điều hướng"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-500">
            <span className="hover:text-slate-800 transition-colors">Lớp 10</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 font-semibold">Toán học</span>
          </div>
        </div>

        {/* Right: Role Switcher & Avatar */}
        <div className="flex items-center space-x-3">
          {/* Native Select Role Switcher */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <label htmlFor="role-select" className="text-slate-500 mr-1.5 font-medium select-none text-[11px] hidden sm:inline">
              Vai trò demo:
            </label>
            <select
              id="role-select"
              aria-label="Vai trò demo"
              value={currentRole}
              onChange={(e) => onChangeRole(e.target.value as Role)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer text-xs"
            >
              <option value="student">Học sinh</option>
              <option value="teacher">Giáo viên</option>
            </select>
          </div>

          {/* User Avatar */}
          <div
            className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-800 font-bold text-xs flex items-center justify-center select-none shadow-2xs"
            title={currentRole === 'student' ? 'Học sinh mẫu' : 'Giáo viên bộ môn'}
            aria-label={currentRole === 'student' ? 'Hồ sơ học sinh' : 'Hồ sơ giáo viên'}
          >
            {currentRole === 'student' ? 'NT' : 'GV'}
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-900 animate-in fade-in duration-150">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">{notice}</span>
          </div>
          {onClearNotice && (
            <button
              type="button"
              onClick={onClearNotice}
              className="text-amber-700 hover:text-amber-950 p-0.5 rounded-md"
              aria-label="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </header>
  );
};
