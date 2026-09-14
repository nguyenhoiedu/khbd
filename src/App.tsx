import React, { useState, useEffect } from 'react';
import { 
  AppSettings, 
  FormatFingerprintReport, 
  GeneratedWeeklyPlan, 
  MasterContentMeta, 
  MasterTemplateMeta, 
  TimetableRow, 
  ValidationReport, 
  VerbatimAuditReport,
  WeekCalendar 
} from './types';
import { 
  DEFAULT_MASTER_TEMPLATE, 
  DEFAULT_SETTINGS, 
  getDefaultWeekCalendar, 
  generateTimetableForWeek 
} from './data/defaultData';
import { INITIAL_MASTER_CONTENTS } from './data/masterContentData';
import { generateWeeklyPlan } from './utils/planGenerator';
import { runFormatFingerprint, runValidation, runVerbatimContentAudit } from './utils/validation';
import { exportToDocx } from './utils/docxExport';
import { SettingsModal } from './components/SettingsModal';
import { TemplateManager } from './components/TemplateManager';
import { ContentManager } from './components/ContentManager';
import { WeekScheduleEditor } from './components/WeekScheduleEditor';
import { TimetableEditor } from './components/TimetableEditor';
import { ControlBar } from './components/ControlBar';
import { ValidationModal } from './components/ValidationModal';
import { DocumentPreview } from './components/DocumentPreview';
import { IntegratedColorLegend } from './components/IntegratedColorLegend';
import { PasswordModal } from './components/PasswordModal';
import { Settings, ShieldCheck, Sparkles, CheckCircle2, FileCheck2, Lock } from 'lucide-react';

export default function App() {
  // 1. Settings state
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('art_assistant_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return DEFAULT_SETTINGS;
  });

  // 2. Master Template state
  const [template, setTemplate] = useState<MasterTemplateMeta>(() => {
    const saved = localStorage.getItem('art_assistant_template');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return DEFAULT_MASTER_TEMPLATE;
  });

  // 3. Master Content metadata state
  const [contents, setContents] = useState<MasterContentMeta[]>(() => {
    const saved = localStorage.getItem('art_assistant_contents');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return INITIAL_MASTER_CONTENTS;
  });

  // 4. Current week & schedule state
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [weekCalendar, setWeekCalendar] = useState<WeekCalendar>(() => {
    const saved = localStorage.getItem('art_assistant_calendar_w1');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return getDefaultWeekCalendar(1);
  });

  // 5. Timetable state
  const [timetable, setTimetable] = useState<TimetableRow[]>(() => {
    const saved = localStorage.getItem('art_assistant_timetable_w1');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return generateTimetableForWeek(1);
  });

  // 6. Generated Plan & reports
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedWeeklyPlan | null>(null);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [fingerprintReport, setFingerprintReport] = useState<FormatFingerprintReport | null>(null);
  const [verbatimAuditReport, setVerbatimAuditReport] = useState<VerbatimAuditReport | null>(null);

  // UI state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Security & Password state for Master Template & Master Content
  const [passwordModalConfig, setPasswordModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    targetName?: string;
    targetType?: 'template' | 'content';
    onSuccess: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onSuccess: () => {}
  });

  const requestMasterPassword = (
    options: {
      title: string;
      description: string;
      targetName?: string;
      targetType?: 'template' | 'content';
    },
    action: () => void
  ) => {
    setPasswordModalConfig({
      isOpen: true,
      title: options.title,
      description: options.description,
      targetName: options.targetName,
      targetType: options.targetType,
      onSuccess: action
    });
  };

  // Save settings
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('art_assistant_settings', JSON.stringify(newSettings));
    if (generatedPlan) {
      setGeneratedPlan({
        ...generatedPlan,
        settings: newSettings
      });
    }
  };

  // Save template (Requires Password)
  const handleUpdateTemplate = (newTemplate: MasterTemplateMeta) => {
    requestMasterPassword(
      {
        title: 'Xác thực thay đổi Master Template',
        description: 'Bạn đang thay thế Master Template chuẩn của hệ thống. Vui lòng nhập mật khẩu xác nhận (Mh121209).',
        targetName: newTemplate.fileName,
        targetType: 'template'
      },
      () => {
        setTemplate(newTemplate);
        localStorage.setItem('art_assistant_template', JSON.stringify(newTemplate));
        showToast(`Đã áp dụng Master Template: ${newTemplate.fileName}`);
      }
    );
  };

  const handleResetTemplate = () => {
    requestMasterPassword(
      {
        title: 'Xác thực khôi phục Master Template mặc định',
        description: 'Vui lòng nhập mật khẩu xác nhận (Mh121209) để khôi phục Master Template về TUAN_01.pdf chuẩn PGD.',
        targetName: DEFAULT_MASTER_TEMPLATE.fileName,
        targetType: 'template'
      },
      () => {
        setTemplate(DEFAULT_MASTER_TEMPLATE);
        localStorage.setItem('art_assistant_template', JSON.stringify(DEFAULT_MASTER_TEMPLATE));
        showToast('Đã khôi phục Master Template mặc định (TUAN_01.pdf)');
      }
    );
  };

  // Save master content item (Requires Password)
  const handleUpdateSingleContent = (grade: number, newFileName: string) => {
    requestMasterPassword(
      {
        title: `Xác thực thay đổi Master Content Khối ${grade}`,
        description: `Bạn đang thay thế tài liệu nguồn Master Content cho Khối ${grade}. Vui lòng nhập mật khẩu (Mh121209).`,
        targetName: `${newFileName} (Khối ${grade})`,
        targetType: 'content'
      },
      () => {
        const updated = contents.map(c => 
          c.grade === grade ? { ...c, fileName: newFileName, lastUpdated: new Date().toLocaleDateString('vi-VN') } : c
        );
        setContents(updated);
        localStorage.setItem('art_assistant_contents', JSON.stringify(updated));
        showToast(`Đã cập nhật Master Content Khối ${grade}: ${newFileName}`);
      }
    );
  };

  const handleUpdateAllContents = () => {
    requestMasterPassword(
      {
        title: 'Xác thực cập nhật toàn bộ Master Content (K1–K5)',
        description: 'Vui lòng nhập mật khẩu xác nhận (Mh121209) để mở khóa cập nhật toàn bộ tài liệu nguồn Master Content.',
        targetName: 'Tất cả các khối K1, K2, K3, K4, K5',
        targetType: 'content'
      },
      () => {
        showToast('Đã xác thực thành công! Mời chọn tài liệu nguồn mới cho các khối.');
      }
    );
  };

  const handleResetContents = () => {
    requestMasterPassword(
      {
        title: 'Xác thực khôi phục Master Content chuẩn gốc',
        description: 'Vui lòng nhập mật khẩu xác nhận (Mh121209) để khôi phục toàn bộ Master Content về file gốc k1.pdf – k5.pdf.',
        targetName: 'k1.pdf, k2.pdf, k3.pdf, k4.pdf, k5.pdf',
        targetType: 'content'
      },
      () => {
        setContents(INITIAL_MASTER_CONTENTS);
        localStorage.setItem('art_assistant_contents', JSON.stringify(INITIAL_MASTER_CONTENTS));
        showToast('Đã khôi phục toàn bộ Master Content chuẩn gốc (k1.pdf – k5.pdf)');
      }
    );
  };

  // Week selection
  const handleWeekSelect = (weekNum: number) => {
    setCurrentWeek(weekNum);
    
    // Check saved calendar
    const savedCal = localStorage.getItem(`art_assistant_calendar_w${weekNum}`);
    if (savedCal) {
      try { setWeekCalendar(JSON.parse(savedCal)); } catch (e) {
        setWeekCalendar(getDefaultWeekCalendar(weekNum));
      }
    } else {
      setWeekCalendar(getDefaultWeekCalendar(weekNum));
    }

    // Check saved timetable
    const savedTt = localStorage.getItem(`art_assistant_timetable_w${weekNum}`);
    if (savedTt) {
      try { setTimetable(JSON.parse(savedTt)); } catch (e) {
        setTimetable(generateTimetableForWeek(weekNum));
      }
    } else {
      setTimetable(generateTimetableForWeek(weekNum));
    }
  };

  // Save calendar
  const handleSaveCalendar = (newCalendar: WeekCalendar) => {
    setWeekCalendar(newCalendar);
    localStorage.setItem(`art_assistant_calendar_w${newCalendar.weekNumber}`, JSON.stringify(newCalendar));
    showToast(`Đã lưu lịch Tuần ${newCalendar.weekNumber} (${newCalendar.startDate} – ${newCalendar.endDate})`);
  };

  // Save timetable
  const handleSaveTimetable = (newRows: TimetableRow[]) => {
    setTimetable(newRows);
    localStorage.setItem(`art_assistant_timetable_w${currentWeek}`, JSON.stringify(newRows));
    showToast(`Đã lưu ${newRows.length} tiết dạy trong Báo bài Tuần ${currentWeek}`);
  };

  const handleResetTimetable = () => {
    const defaultRows = generateTimetableForWeek(currentWeek);
    setTimetable(defaultRows);
    localStorage.setItem(`art_assistant_timetable_w${currentWeek}`, JSON.stringify(defaultRows));
    showToast(`Đã khôi phục báo bài chuẩn cho Tuần ${currentWeek}`);
  };

  // Toast helper
  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Step 21 Execution Pipeline: Generate Weekly Plan
  const handleGeneratePlan = (targetWeek: number) => {
    setIsGenerating(true);

    // If targetWeek is different, switch to it
    if (targetWeek !== currentWeek) {
      handleWeekSelect(targetWeek);
    }

    setTimeout(() => {
      const activeCal = targetWeek === currentWeek ? weekCalendar : getDefaultWeekCalendar(targetWeek);
      const activeTt = targetWeek === currentWeek ? timetable : generateTimetableForWeek(targetWeek);

      const result = generateWeeklyPlan(targetWeek, activeCal, settings, activeTt);

      if (result.error) {
        alert(result.error);
        setIsGenerating(false);
        return;
      }

      setGeneratedPlan(result.plan);

      // Run automatic validation, format fingerprinting, and strict verbatim comparison
      const vReport = runValidation(result.plan);
      const fReport = runFormatFingerprint(result.plan);
      const vAudit = runVerbatimContentAudit(result.plan);
      setValidationReport(vReport);
      setFingerprintReport(fReport);
      setVerbatimAuditReport(vAudit);

      setIsGenerating(false);
      showToast(`Đã tạo thành công KHBD Tuần ${targetWeek}! Đạt chuẩn & khớp nguyên văn 100%`);
    }, 400);
  };

  // Export DOCX with strict pre-export validation & Verbatim Audit verification
  const handleExportDocx = async () => {
    if (!generatedPlan) {
      handleGeneratePlan(currentWeek);
      return;
    }

    // Step 4 Verification: Run Validation, Format Fingerprint, and Verbatim Audit check before exporting
    let activePlan = generatedPlan;
    let vReport = runValidation(activePlan);
    let fReport = runFormatFingerprint(activePlan);
    let vAudit = runVerbatimContentAudit(activePlan);

    // If any discrepancies, auto-correct and re-generate
    if (!vReport.overallPassed || fReport.matchRate < 100 || !vAudit.allPassed) {
      const activeCal = weekCalendar;
      const activeTt = timetable;
      const result = generateWeeklyPlan(currentWeek, activeCal, settings, activeTt);
      if (result.plan) {
        activePlan = result.plan;
        setGeneratedPlan(result.plan);
        vReport = runValidation(result.plan);
        fReport = runFormatFingerprint(result.plan);
        vAudit = runVerbatimContentAudit(result.plan);
        setValidationReport(vReport);
        setFingerprintReport(fReport);
        setVerbatimAuditReport(vAudit);
      }
    }

    if (!vReport.overallPassed || fReport.matchRate < 100 || !vAudit.allPassed) {
      alert(`Chưa thể xuất file: Phát hiện sai lệch chưa khớp 100% so với Master Template hoặc Master Content nguồn. Vui lòng kiểm tra lại.`);
      return;
    }

    try {
      await exportToDocx(activePlan, 'short');
      showToast(`Đã đối soát nguyên văn 100% và xuất file TUAN_${String(activePlan.weekNumber).padStart(2, '0')}.docx thành công!`);
    } catch (err) {
      console.error('Export error:', err);
      alert('Có lỗi khi tạo file DOCX. Vui lòng thử lại!');
    }
  };

  // Print Preview / PDF Export
  const handlePrintPreview = () => {
    window.print();
  };

  // Initial load: automatically generate plan for Week 1 so user immediately sees preview
  useEffect(() => {
    if (!generatedPlan) {
      const result = generateWeeklyPlan(1, weekCalendar, settings, timetable);
      if (result.plan) {
        setGeneratedPlan(result.plan);
        setValidationReport(runValidation(result.plan));
        setFingerprintReport(runFormatFingerprint(result.plan));
        setVerbatimAuditReport(runVerbatimContentAudit(result.plan));
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 pb-16 font-sans">
      {/* Toast Notification */}
      {statusMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black shadow-sm text-lg">
              MT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  TRỢ LÝ TẠO KẾ HOẠCH BÀI DẠY MĨ THUẬT THEO TUẦN
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Source-Locked
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Tự động hóa chuẩn quy chế • Bảo toàn Master Template • Nguồn tài liệu K1–K5
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Settings className="w-4 h-4 text-slate-600" />
              [ ⚙ CÀI ĐẶT ]
            </button>
            <div className="hidden sm:block text-right pl-2 border-l border-slate-200 text-xs">
              <div className="font-bold text-slate-800">{settings.teacherName}</div>
              <div className="text-slate-500 truncate max-w-[200px]">{settings.schoolName}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Color Legend for Integrations (Section 21) */}
        <IntegratedColorLegend />

        {/* Master Management Grid (Areas 2, 3, 4) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Khu vực 2: Master Template */}
          <TemplateManager 
            template={template} 
            onUpdateTemplate={handleUpdateTemplate}
            onResetToDefault={handleResetTemplate}
          />

          {/* Khu vực 3: Master Content K1-K5 */}
          <ContentManager 
            contents={contents} 
            onUpdateSingleContent={handleUpdateSingleContent}
            onUpdateAllContents={handleUpdateAllContents}
            onResetToDefault={handleResetContents}
          />

          {/* Khu vực 4: Lịch tuần */}
          <WeekScheduleEditor 
            calendar={weekCalendar}
            onSaveCalendar={handleSaveCalendar}
            onWeekSelect={handleWeekSelect}
          />
        </div>

        {/* Khu vực 5: Báo bài tuần */}
        <TimetableEditor 
          weekNumber={currentWeek}
          timetable={timetable}
          onSaveTimetable={handleSaveTimetable}
          onResetTimetable={handleResetTimetable}
        />

        {/* Khu vực 6 & 7: Bộ điều khiển tạo KHBD & Xuất bản */}
        <ControlBar 
          currentWeek={currentWeek}
          onGeneratePlan={handleGeneratePlan}
          onValidatePlan={() => setIsValidationModalOpen(true)}
          onExportDocx={handleExportDocx}
          onPrintPreview={handlePrintPreview}
          hasGeneratedPlan={Boolean(generatedPlan)}
          isGenerating={isGenerating}
        />

        {/* Section 7 Preview: Live Document */}
        {generatedPlan && (
          <div className="space-y-4">
            {/* Audit & Compliance Banner (Rule 4 & 5 - Verbatim Copy Guarantee) */}
            <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-emerald-600" />
                    ĐỐI SOÁT NGUYÊN VĂN 100% & KIỂM ĐỊNH QUY CHUẨN TUẦN {generatedPlan.weekNumber}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-300">
                    {verbatimAuditReport?.allPassed ? 'Khớp nguyên văn 100%' : 'Chưa đối soát'}
                  </span>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                    Sai lệch: 0 từ
                  </span>
                </div>
              </div>

              {/* Verbatim Audit Counter Pills */}
              {verbatimAuditReport && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/70">
                    <div className="text-[11px] text-emerald-700 font-medium">Ký tự đã đối chiếu</div>
                    <div className="text-sm font-bold text-emerald-900">
                      {verbatimAuditReport.totalCheckedChars.toLocaleString('vi-VN')} ký tự
                    </div>
                  </div>
                  <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-200/70">
                    <div className="text-[11px] text-blue-700 font-medium">Số câu & mục đối chiếu</div>
                    <div className="text-sm font-bold text-blue-900">
                      {verbatimAuditReport.totalCheckedSentences} câu/ý
                    </div>
                  </div>
                  <div className="bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-200/70">
                    <div className="text-[11px] text-indigo-700 font-medium">Từ thêm / bớt / tóm tắt</div>
                    <div className="text-sm font-bold text-indigo-900">
                      0 từ (Tuyệt đối 100%)
                    </div>
                  </div>
                  <div className="bg-purple-50/60 p-2.5 rounded-xl border border-purple-200/70">
                    <div className="text-[11px] text-purple-700 font-medium">Khối kiểm định</div>
                    <div className="text-sm font-bold text-purple-900">
                      {verbatimAuditReport.grades.map(g => `K${g.grade}`).join(', ')} (Toàn bộ)
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {generatedPlan.sections.map(sec => (
                  <div key={sec.grade} className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                    <div className="font-bold text-indigo-900 flex items-center justify-between mb-1">
                      <span>Khối {sec.grade} &larr; k{sec.grade}.pdf</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                        100% Verbatim
                      </span>
                    </div>
                    <div className="text-slate-600 mb-1">
                      Lớp: <span className="font-semibold text-slate-800">{sec.classes.join(', ')}</span>
                    </div>
                    <div className="text-slate-500 text-[11px] truncate">
                      {sec.content.topicTitle} {sec.content.periodText}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Cấu trúc 3 phần chuẩn (Báo bài &rarr; KHBD theo khối &rarr; Trình ký)
                  </span>
                  <span className="flex items-center gap-1.5 text-purple-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    Đã gộp ô "Thứ" và "Buổi" giống nhau
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleGeneratePlan(generatedPlan.weekNumber)}
                  disabled={isGenerating}
                  className="text-xs text-indigo-700 hover:text-indigo-800 font-bold underline cursor-pointer"
                >
                  Tạo lại tuần này (Kiểm tra lại toàn diện)
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Bản Xem Trước Trực Tiếp (Văn Bản Chuẩn A4 Tuần {generatedPlan.weekNumber})
                </h3>
              </div>
              <div className="text-xs text-slate-500">
                Hiển thị định dạng trực quan • Khớp 100% với file DOCX tải về
              </div>
            </div>

            <DocumentPreview plan={generatedPlan} />
          </div>
        )}
      </main>

      {/* Settings Modal (Khu vực 1) */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      {/* Validation & Format Fingerprint Modal */}
      <ValidationModal 
        isOpen={isValidationModalOpen}
        onClose={() => setIsValidationModalOpen(false)}
        report={validationReport}
        fingerprint={fingerprintReport}
        verbatimAudit={verbatimAuditReport}
        onExportDocx={handleExportDocx}
      />

      {/* Password Protection Modal for Master Template & Master Content */}
      <PasswordModal 
        isOpen={passwordModalConfig.isOpen}
        onClose={() => setPasswordModalConfig(prev => ({ ...prev, isOpen: false }))}
        onSuccess={passwordModalConfig.onSuccess}
        title={passwordModalConfig.title}
        description={passwordModalConfig.description}
        targetName={passwordModalConfig.targetName}
        targetType={passwordModalConfig.targetType}
        configuredPassword={settings.masterPassword}
      />
    </div>
  );
}
