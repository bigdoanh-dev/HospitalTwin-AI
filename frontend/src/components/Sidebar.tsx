import React from 'react';
import {
  LayoutDashboard,
  Activity,
  Box,
  Video,
  CalendarCheck2,
  GitFork,
  Cpu,
  Bot,
  FileCheck,
  Sliders,
  ShieldCheck,
  UserCheck,
  Settings,
  Sparkles,
  Lock,
  X
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ModuleType, UserProfile } from '../types/hospital';

interface SidebarProps {
  activeModule: ModuleType;
  onSelectModule: (module: ModuleType) => void;
  currentUser: UserProfile | null;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  currentUser,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const isPatient = currentUser?.role === 'patient';
  const reducedMotion = useReducedMotion();

  const navItems: Array<{ id: ModuleType; label: string; icon: React.FC<any>; staffOnly?: boolean }> = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard, staffOnly: true },
    { id: 'monitoring', label: 'Giám sát 3D', icon: Activity, staffOnly: true },
    { id: 'digital_twin', label: 'Digital Twin', icon: Box, staffOnly: true },
    { id: 'camera', label: 'Camera không gian', icon: Video, staffOnly: true },
    { id: 'operations', label: 'Vận hành ngoại trú', icon: CalendarCheck2, staffOnly: true },
    { id: 'process', label: 'Thiết kế quy trình', icon: GitFork, staffOnly: true },
    { id: 'simulation', label: 'Mô phỏng SimPy', icon: Cpu, staffOnly: true },
    { id: 'ai', label: 'Trợ lý AI', icon: Bot, staffOnly: true },
    { id: 'interventions', label: 'Can thiệp & Duyệt', icon: FileCheck, staffOnly: true },
    { id: 'adaptive', label: 'Vận hành thích ứng', icon: Sliders, staffOnly: true },
    { id: 'admin', label: 'Quản trị hệ thống', icon: ShieldCheck, staffOnly: true },
    { id: 'patient', label: 'Cổng người bệnh', icon: UserCheck, staffOnly: false },
  ];

  return (
    <>
      {/* Mobile Backdrop with AnimatePresence */}
      <AnimatePresence>
        {isOpenMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-xs"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 lg:static lg:z-30
        w-[224px] shrink-0 border-r border-slate-200/90 bg-white
        flex flex-col justify-between py-4 px-3 select-none
        transition-transform duration-200 ease-in-out
        ${isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div>
          {/* Logo & Mobile close button */}
          <div className="flex items-center justify-between px-2 mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <span className="absolute w-4 h-1.5 bg-white rounded-xs"></span>
                  <span className="absolute w-1.5 h-4 bg-white rounded-xs"></span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-[15px] text-slate-900 tracking-tight leading-tight">HospitalTwin AI</span>
                <span className="text-[10px] text-slate-500 font-medium">Bản sao số bệnh viện</span>
              </div>
            </div>

            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                aria-label="Đóng thanh điều hướng"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {isPatient && (
            <div className="mx-2 mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-800 font-medium leading-relaxed">
              Tài khoản người bệnh chỉ truy cập được Cổng tra cứu lượt khám cá nhân.
            </div>
          )}

          {/* Navigation list with Framer Motion Active Indicator */}
          <nav className="space-y-1 relative" aria-label="Danh mục phân hệ bệnh viện">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              const isLocked = isPatient && item.staffOnly;

              return (
                <button
                  key={item.id}
                  disabled={isLocked}
                  onClick={() => {
                    onSelectModule(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  title={isLocked ? 'Tính năng giới hạn nội bộ bệnh viện' : item.label}
                  aria-label={item.label}
                  className={`relative w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium transition-colors text-left ${
                    isActive
                      ? 'text-white font-semibold'
                      : isLocked
                      ? 'opacity-40 cursor-not-allowed text-slate-400 hover:bg-transparent'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  {/* Framer Motion Active Indicator Pill */}
                  {isActive && (
                    <motion.div
                      layoutId={reducedMotion ? undefined : 'activeNavIndicator'}
                      className="absolute inset-0 bg-blue-600 rounded-xl shadow-xs shadow-blue-500/20"
                      transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}

                  <div className="relative z-10 flex items-center space-x-2.5 truncate">
                    <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} strokeWidth={1.8} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {isLocked && <Lock className="relative z-10 w-3 h-3 text-slate-400" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Info & Settings */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600">
            <div className="flex items-center space-x-1.5 text-blue-700 font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bản trình diễn nghiên cứu</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              HospitalTwin AI<br />
              Digital Twin vận hành ngoại trú<br />
              <span className="text-slate-400 font-mono">v0.1.0 · SimPy + R3F</span>
            </p>
          </div>

          {!isPatient && (
            <button
              onClick={() => {
                onSelectModule('admin');
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-[13px] text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
              aria-label="Cài đặt quản trị hệ thống"
              title="Cài đặt quản trị"
            >
              <Settings className="w-[18px] h-[18px] text-slate-400" strokeWidth={1.8} />
              <span>Quản trị & Phân quyền</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
