import React, { useRef, useState } from 'react';
import { MasterTemplateMeta } from '../types';
import { FileText, Upload, AlertTriangle, CheckCircle2, RefreshCw, Lock } from 'lucide-react';

interface Props {
  template: MasterTemplateMeta;
  onUpdateTemplate: (newTemplate: MasterTemplateMeta) => void;
  onResetToDefault: () => void;
}

export const TemplateManager: React.FC<Props> = ({ template, onUpdateTemplate, onResetToDefault }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'docx' || ext === 'pdf') {
        setPendingFile(file);
        setShowConfirmModal(true);
      } else {
        alert('Vui lòng chọn file định dạng .DOCX hoặc .PDF');
      }
    }
    // reset input value so re-uploading same file triggers change
    e.target.value = '';
  };

  const confirmReplacement = () => {
    if (pendingFile) {
      const ext = pendingFile.name.split('.').pop()?.toLowerCase() as 'docx' | 'pdf';
      onUpdateTemplate({
        fileName: pendingFile.name,
        fileType: ext,
        uploadedAt: new Date().toLocaleDateString('vi-VN'),
        isCustom: true,
        version: 'Bản người dùng tải lên'
      });
    }
    setShowConfirmModal(false);
    setPendingFile(null);
  };

  const cancelReplacement = () => {
    setShowConfirmModal(false);
    setPendingFile(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[11px] uppercase tracking-wider">
              Khu vực 2
            </span>
            <h2 className="text-sm font-bold text-slate-800">MASTER TEMPLATE</h2>
          </div>
          {template.isCustom && (
            <button
              onClick={onResetToDefault}
              title="Khôi phục Master Template mặc định (TUAN_01.pdf)"
              className="text-[11px] text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-medium transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Mặc định
            </button>
          )}
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 mb-4">
          <div className="text-xs text-slate-500 font-medium mb-1">MASTER TEMPLATE HIỆN TẠI:</div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm text-slate-900 truncate">
                {template.fileName}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span>{template.fileType.toUpperCase()}</span>
                <span>•</span>
                <span>{template.version}</span>
              </div>
            </div>
            <div className="shrink-0 flex items-center text-emerald-600 font-semibold text-xs gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Chuẩn Format
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-600 space-y-1 mb-4 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/60">
          <div className="font-bold text-amber-900 text-[11px]">Format Map Bảo Toàn:</div>
          <p className="text-[11px] text-slate-600">
            • Khổ giấy A4 • Font: Times New Roman • Cỡ chữ 12–14pt • Header & Footer chuẩn • Bảng báo bài 7 cột • Bảng HĐDH 2 cột (HĐ GV / HĐ HS)
          </p>
        </div>
      </div>

      <div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".docx,.pdf"
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2.5 px-4 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-between transition-colors cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span>THAY MASTER TEMPLATE</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-medium border border-indigo-200">
            <Lock className="w-3 h-3 text-indigo-600" /> Cần mật khẩu
          </span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-2">
              Xác nhận thay thế Master Template
            </h3>
            <p className="text-sm text-slate-600 text-center font-medium leading-relaxed mb-4">
              &quot;Bạn có chắc chắn muốn thay thế MASTER TEMPLATE hiện tại không?&quot;
            </p>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 mb-6 space-y-1.5">
              <div>• File mới: <span className="font-bold text-slate-900">{pendingFile?.name}</span></div>
              <div>• Quy tắc: Không làm thay đổi K1–K5, Báo bài, Lịch tuần hay Cài đặt.</div>
              <div className="text-indigo-700 font-semibold flex items-center gap-1 pt-1 border-t border-slate-200">
                <Lock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Bảo mật: Yêu cầu mật khẩu quản trị (Mh121209) để mở khóa.</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={cancelReplacement}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmReplacement}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                Xác nhận thay thế
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
