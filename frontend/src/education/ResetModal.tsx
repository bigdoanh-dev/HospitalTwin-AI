import React from 'react';
import { useDialogFocus } from './useDialogFocus';
import { AlertCircle, RotateCcw, X } from 'lucide-react';

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ResetModal: React.FC<ResetModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const panel = useDialogFocus(isOpen, onClose);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="reset-title" className="relative bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-xl space-y-4 z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 id="reset-title" className="font-extrabold text-sm text-slate-900">
                Bắt đầu lại bài học mẫu?
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Thiết lập lại dữ liệu tương tác
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại bắt đầu lại"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Thao tác này sẽ đưa toàn bộ câu trả lời trắc nghiệm, các đề xuất lộ trình và lịch sử trao đổi của bài học <strong>Toán 10: Khám phá hàm số bậc hai</strong> về trạng thái khởi tạo ban đầu.
        </p>

        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Xác nhận bắt đầu lại</span>
          </button>
        </div>
      </div>
    </div>
  );
};
