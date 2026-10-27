import React, { useState, useEffect } from 'react';
import {
  Home,
  ChevronRight,
  Building2,
  Calendar,
  Clock,
  Bell,
  ChevronDown,
  Check,
  Play,
  Pause,
  FastForward,
  ShieldCheck,
  Info,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { UserProfile } from '../types/hospital';
import { api } from '../services/api';

interface HeaderProps {
  currentModule: string;
  currentUser: UserProfile | null;
  onSwitchRole: (role: string) => void;
  onRefreshData?: () => void;
  clockTime?: string;
  isClockRunning?: boolean;
  onToggleClock?: () => void;
  onTickClock?: (mins: number) => void;
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentModule,
  currentUser,
  onSwitchRole,
  onRefreshData,
  clockTime = '2026-10-27 10:24:36',
  isClockRunning = false,
  onToggleClock,
  onTickClock,
  onToggleMobileSidebar
}) => {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  const roleTitles: Record<string, string> = { operator: 'Điều phối vận hành', director: 'Ban Giám đốc', analyst: 'Chuyên viên phân tích', department_manager: 'Trưởng khoa', doctor: 'Bác sĩ', lab_staff: 'Kỹ thuật viên xét nghiệm', receptionist: 'Tiếp đón', maintenance: 'Bảo trì', camera_operator: 'Giám sát camera', cashier: 'Thu ngân', pharmacy_staff: 'Dược sĩ', patient: 'Người bệnh', admin: 'Quản trị viên' };
  const [roles, setRoles] = useState<Array<{id: string; name: string; title: string}>>([]);
  useEffect(() => { api.getDemoUsers().then(users => setRoles(users.map(u => ({ id: u.role, name: u.full_name, title: roleTitles[u.role] || u.role })))).catch(() => {}); }, []);

  const moduleNames: Record<string, string> = {
    overview: 'Tổng quan',
    monitoring: 'Giám sát 3D',
    digital_twin: 'Digital Twin 3D',
    camera: 'Camera giám sát',
    operations: 'Vận hành ngoại trú',
    process: 'Thiết kế quy trình',
    simulation: 'Mô phỏng & Kịch bản',
    ai: 'Trợ lý AI bệnh viện',
    interventions: 'Can thiệp & Phê duyệt',
    adaptive: 'Vận hành thích ứng',
    admin: 'Quản trị hệ thống',
    patient: 'Cổng thông tin người bệnh',
  };

  const formattedDate = clockTime.includes('T') ? clockTime.split('T')[0] : clockTime.split(' ')[0] || '2026-10-27';
  const formattedTime = clockTime.includes('T') ? clockTime.split('T')[1]?.slice(0, 8) : clockTime.split(' ')[1] || '10:24:36';

  return (
    <header className="h-14 border-b border-slate-200/90 bg-white px-4 sm:px-5 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Breadcrumbs & Mobile Menu Trigger */}
      <div className="flex items-center space-x-2 text-xs text-slate-500 min-w-0">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 mr-1"
            aria-label="Mở danh mục phân hệ"
            title="Mở menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <Home className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0" />
        <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
        <span className="hover:text-slate-700 cursor-pointer truncate">{moduleNames[currentModule] || 'Giám sát'}</span>
        <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
        <span className="font-semibold text-slate-800 truncate">
          {currentUser?.role === 'patient' ? 'Người bệnh' : 'Ngoại trú'}
        </span>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* Building selector dropdown */}
        <div className="hidden xl:flex items-center space-x-2 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700">
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Tòa nhà A - Khám ngoại trú</span>
        </div>

        {/* Data mode indicator */}
        <div className="hidden md:flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Mô phỏng tất định</span>
        </div>

        {/* Synthetic Clock & Clock controls */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
          <Calendar className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
          <span className="hidden sm:inline font-mono text-[11px] font-semibold">{formattedDate}</span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono text-[11px] font-bold text-blue-700">{formattedTime}</span>

          {onToggleClock && (
            <button
              onClick={onToggleClock}
              className="ml-1 p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
              title={isClockRunning ? 'Tạm dừng đồng hồ mô phỏng' : 'Chạy đồng hồ mô phỏng'}
              aria-label={isClockRunning ? 'Tạm dừng đồng hồ mô phỏng' : 'Chạy đồng hồ mô phỏng'}
            >
              {isClockRunning ? <Pause className="w-3 h-3 text-amber-600" /> : <Play className="w-3 h-3 text-emerald-600" />}
            </button>
          )}

          {onTickClock && (
            <button
              onClick={() => onTickClock(5)}
              className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
              title="Tua tới +5 phút"
              aria-label="Tua tới +5 phút"
            >
              <FastForward className="w-3 h-3 text-blue-600" />
            </button>
          )}
        </div>

        {/* User profile & Role switcher */}
        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center space-x-2 pl-2 pr-1.5 py-1 rounded-lg hover:bg-slate-50 transition-colors border border-slate-200"
            aria-label="Chọn vai trò demo"
            title="Đổi vai trò người dùng"
          >
            <div className={`w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-xs ${
              currentUser?.role === 'director' ? 'bg-indigo-600' :
              currentUser?.role === 'patient' ? 'bg-amber-600' :
              currentUser?.role === 'admin' ? 'bg-purple-600' : 'bg-blue-600'
            }`}>
              {currentUser?.username?.slice(0, 2).toUpperCase() || 'OP'}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 leading-none truncate max-w-[120px]">
                {currentUser?.full_name || 'Đang kết nối…'}
              </div>
              <div className="text-[10px] text-slate-500 leading-tight mt-0.5 truncate max-w-[120px]">
                {roles.find(r => r.id === currentUser?.role)?.title || currentUser?.role}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Role Switcher Dropdown with Framer Motion */}
          <AnimatePresence>
            {roleMenuOpen && (
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-24px)] bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50"
              >
                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Chọn vai trò trình diễn
                  </span>
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-mono font-semibold">
                    DEMO
                  </span>
                </div>
                <div className="max-h-80 overflow-y-auto py-1">
                  {roles.map((r) => {
                    const isSelected = currentUser?.role === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => {
                          onSwitchRole(r.id);
                          setRoleMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                          isSelected ? 'bg-blue-50 text-blue-800 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-slate-800">{r.name}</div>
                          <div className="text-[11px] text-slate-500 font-normal">{r.title}</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
