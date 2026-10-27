import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'error' | 'success' | 'info';
  title: string;
  detail?: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-md w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto p-4 rounded-xl shadow-lg border flex items-start space-x-3 transition-all animate-in fade-in slide-in-from-bottom-2 ${
            t.type === 'error'
              ? 'bg-red-50/95 border-red-200 text-red-900'
              : t.type === 'success'
              ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900'
              : 'bg-blue-50/95 border-blue-200 text-blue-900'
          }`}
        >
          {t.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
          {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
          {t.type === 'info' && <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}

          <div className="flex-1 text-xs">
            <div className="font-bold">{t.title}</div>
            {t.detail && <div className="mt-0.5 text-slate-600 leading-relaxed whitespace-pre-line">{t.detail}</div>}
          </div>

          <button
            onClick={() => onDismiss(t.id)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
            title="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export const Toast: React.FC<{
  type: 'error' | 'success' | 'info';
  message: string;
  onClose: () => void;
}> = ({ type, message, onClose }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md w-full pointer-events-none">
      <div
        className={`pointer-events-auto p-4 rounded-xl shadow-lg border flex items-start space-x-3 transition-all animate-in fade-in slide-in-from-bottom-2 ${
          type === 'error'
            ? 'bg-red-50/95 border-red-200 text-red-900'
            : type === 'success'
            ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900'
            : 'bg-blue-50/95 border-blue-200 text-blue-900'
        }`}
      >
        {type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
        {type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
        {type === 'info' && <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}

        <div className="flex-1 text-xs">
          <div className="font-bold">{type === 'error' ? 'Lỗi hệ thống' : type === 'success' ? 'Thành công' : 'Thông báo'}</div>
          <div className="mt-0.5 text-slate-600 leading-relaxed whitespace-pre-line">{message}</div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          title="Đóng thông báo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
