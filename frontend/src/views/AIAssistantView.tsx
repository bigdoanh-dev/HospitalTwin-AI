import React, { useState, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  FileText,
  Info,
  Clock,
  ArrowRight,
  Database,
  Sliders,
  X
} from 'lucide-react';
import { api } from '../services/api';

interface AIAssistantViewProps {
  initialRoomId?: string;
  onNavigateToSimulation: (versionId?: string) => void;
  onNavigateToIntervention: () => void;
}

interface EvidenceItem {
  title: string;
  value: string;
  timestamp?: string;
  kind?: string;
  source?: string;
  sample_size?: number;
  room_id?: string;
  status?: string;
}

interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  action_type?: string;
  params?: any;
  expected_reduction?: string;
  simulation_ready?: boolean;
  assumptions?: string[];
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  evidence?: EvidenceItem[];
  recommendations?: RecommendationItem[];
  structured_draft?: any;
  isError?: boolean;
  targetRoomId?: string;
}

/** Render inline text converting **bold** to <strong> and stripping raw asterisks */
function renderMarkdownInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const content = part.slice(2, -2);
      return (
        <strong key={i} className="font-bold text-slate-900">
          {content}
        </strong>
      );
    }
    return part;
  });
}

/** Formatted text renderer for bullet lists, sections and bold text without raw markdown */
function FormattedMessage({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-1.5 text-xs text-slate-800 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
          const itemText = trimmed.slice(2);
          return (
            <div key={idx} className="flex items-start space-x-2 pl-1.5">
              <span className="text-blue-600 font-bold leading-none select-none mt-1">•</span>
              <div className="flex-1">{renderMarkdownInline(itemText)}</div>
            </div>
          );
        }
        return (
          <p key={idx} className="leading-relaxed">
            {renderMarkdownInline(line)}
          </p>
        );
      })}
    </div>
  );
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  initialRoomId,
  onNavigateToSimulation,
  onNavigateToIntervention
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [persistingId, setPersistingId] = useState<string | null>(null);
  const [simGuidanceRec, setSimGuidanceRec] = useState<RecommendationItem | null>(null);

  const [conversation, setConversation] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: `Xin chào! Tôi là Trợ lý AI Phân tích Vận hành Bệnh viện (Rule-based Evidence Engine). Hệ thống hoạt động dựa trên dữ liệu tổng hợp (synthetic data) trích xuất từ cơ sở dữ liệu số, camera mô phỏng và cảm biến luồng khám, không phụ thuộc API key ngoài.

Mọi phân tích đều đi kèm bằng chứng định lượng minh bạch. Các đề xuất cấu hình cần được kiểm chứng qua mô phỏng SimPy trước khi lập đề xuất can thiệp trình Ban Giám đốc phê duyệt.`
    }
  ]);

  const runQuery = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { sender: 'user', text };
    setConversation((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await api.queryAI(text, initialRoomId);
      setConversation((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: res.response || 'Đã nhận kết quả phân tích.',
          evidence: res.evidence || [],
          recommendations: res.recommendations || [],
          structured_draft: res.structured_draft,
          targetRoomId: res.target_room_id,
        }
      ]);
    } catch (err: any) {
      setConversation((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `Không thể hoàn tất phân tích: ${err?.message || 'Lỗi kết nối máy chủ API'}. Vui lòng kiểm tra lại dịch vụ backend.`,
          isError: true,
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialRoomId === 'ROOM-LAB-101') {
      runQuery('Tại sao khu vực lấy mẫu xét nghiệm tầng 1 đông bất thường?');
    }
  }, [initialRoomId]);

  /** Persist recommendation config as a real scenario version and navigate to simulation */
  const handleSimulateRecommendation = async (rec: RecommendationItem) => {
    setPersistingId(rec.id);
    try {
      const scenarioRes = await api.createScenario({
        name: `Kịch bản: ${rec.title}`,
        description: `${rec.description || 'Đề xuất từ Trợ lý AI'}. Cấu hình tự động lưu cho phân hệ mô phỏng.`,
        config: {
          lab_counters: rec.params?.lab_counters ?? 7,
          lab_staff: rec.params?.lab_staff ?? (rec.params?.lab_counters ?? 7),
          service_time: rec.params?.service_time ?? 8,
          ct_online: rec.params?.ct_online ?? true,
          exam_counters: rec.params?.exam_counters ?? 14,
        },
        nodes: [],
        edges: []
      });

      const versionId = scenarioRes.latest_version_id || (scenarioRes.versions && scenarioRes.versions[0]?.id);
      if (versionId) {
        onNavigateToSimulation(versionId);
      } else {
        onNavigateToSimulation();
      }
    } catch (err: any) {
      // If error creating scenario, still allow opening simulation
      console.warn('Lỗi lưu kịch bản AI, mở mô phỏng thông thường:', err);
      onNavigateToSimulation();
    } finally {
      setPersistingId(null);
    }
  };

  /** Format timestamp from API without fabricating timestamps */
  const formatTimestamp = (ts?: string) => {
    if (!ts) return null;
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleTimeString('vi-VN', { hour12: false });
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Trợ lý Trí tuệ Nhân tạo Phân tích Vận hành (AI Assistant)
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Suy luận dựa trên luật (Rule-based) & Bằng chứng dữ liệu thực tế • Đề xuất kịch bản can thiệp
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl font-medium shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Rule-based Grounding • Không dùng LLM ngoài</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Chat Stream (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col h-[600px]">
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {conversation.map((msg, idx) => (
              <div
                key={idx}
                className={`flex space-x-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                    msg.isError ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                  }`}>
                    {msg.isError ? <AlertCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                )}

                <div className={`max-w-[88%] rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-xs'
                    : msg.isError
                    ? 'bg-red-50 border border-red-200 text-red-800 rounded-tl-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-xs space-y-3'
                }`}>
                  {msg.isError ? (
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{msg.text}</span>
                    </div>
                  ) : (
                    <FormattedMessage content={msg.text} />
                  )}

                  {/* Evidence Cards */}
                  {msg.evidence && msg.evidence.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                          <Database className="w-3 h-3 text-blue-600" />
                          Bằng chứng định lượng từ hệ thống:
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Dữ liệu quan sát thực tế</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {msg.evidence.map((ev, i) => {
                          const timeStr = formatTimestamp(ev.timestamp);
                          return (
                            <div key={i} className="bg-white p-2.5 rounded-xl border border-slate-200 text-left space-y-1 shadow-2xs">
                              <span className="text-[10px] text-slate-500 font-medium block truncate" title={ev.title}>
                                {ev.title}
                              </span>
                              <div className="font-extrabold text-xs text-blue-700 truncate">
                                {ev.value}
                              </div>
                              <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                                <span>{ev.source || 'DB'}</span>
                                {timeStr && <span>{timeStr}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {msg.recommendations && msg.recommendations.map((rec) => (
                    <div key={rec.id} className="mt-3 bg-blue-50/90 border border-blue-200 rounded-xl p-3.5 text-blue-950 shadow-2xs">
                      <div className="flex items-center space-x-1.5 font-bold text-xs text-blue-900 mb-1">
                        <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{rec.title}</span>
                      </div>
                      <p className="text-[11px] text-blue-900 leading-relaxed mb-2.5">
                        {rec.description}
                      </p>

                      {rec.expected_reduction && (
                        <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50/80 border border-emerald-200/70 rounded-lg px-2.5 py-1 mb-3 inline-block">
                          Dự kiến: {rec.expected_reduction}
                        </div>
                      )}

                      {rec.assumptions && rec.assumptions.length > 0 && (
                        <div className="text-[10px] text-slate-600 mb-3 space-y-0.5">
                          <span className="font-semibold text-slate-700">Giả định: </span>
                          {rec.assumptions.join('; ')}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-blue-100">
                        <button
                          onClick={() => handleSimulateRecommendation(rec)}
                          disabled={persistingId === rec.id}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>{persistingId === rec.id ? 'Đang tạo kịch bản...' : 'Mô phỏng trước khi duyệt'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setSimGuidanceRec(rec)}
                          className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          Tạo đề xuất can thiệp
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex space-x-3 justify-start items-center">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-500 rounded-tl-xs flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                  <span>Trợ lý AI đang truy xuất cơ sở dữ liệu và đánh giá bằng chứng...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Suggested Queries */}
          <div className="py-2.5 flex items-center space-x-2 overflow-x-auto text-[11px] border-t border-slate-100">
            {[
              'Tại sao khu lấy mẫu tầng 1 đông?',
              'Nếu thêm 1 bàn lấy mẫu thì giảm bao nhiêu phút?',
              'Kiểm tra sự cố CT Scanner tầng 3',
              'Tổng quan vận hành sáng nay'
            ].map((q, i) => (
              <button
                key={i}
                onClick={() => runQuery(q)}
                disabled={loading}
                className="whitespace-nowrap bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 px-3 py-1 rounded-full transition-colors font-medium cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runQuery(query);
            }}
            className="flex items-center space-x-2 pt-2 border-t border-slate-100"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Đặt câu hỏi về hàng đợi, thời gian chờ, thiết bị hoặc đề xuất can thiệp..."
              disabled={loading}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Reference Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs text-xs space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Nguyên tắc Suy luận & Căn cứ
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Trợ lý AI bệnh viện hoạt động theo kiến trúc <strong>Evidence-backed Grounding</strong>:
            </p>
            <ul className="space-y-2.5 text-slate-600">
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Không bịa đặt số liệu:</strong> Mọi con số đều truy xuất từ bản ghi HIS và cảm biến hiện hữu.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Không giả định cảm tính:</strong> Camera giả lập đếm số người hiện diện vật lý, phân biệt với danh sách bệnh nhân đang chờ phục vụ.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Kiểm chứng SimPy:</strong> Đề xuất tăng bàn lấy mẫu hoặc đổi ca phải qua mô phỏng trước khi trình duyệt.</span>
              </li>
            </ul>
          </div>

          <div className="bg-blue-50/80 border border-blue-200/90 rounded-2xl p-4 text-xs text-blue-900 space-y-2">
            <h4 className="font-extrabold text-blue-950 flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
              Luồng vận hành chuẩn:
            </h4>
            <div className="space-y-1.5 text-blue-800 text-[11px] leading-relaxed">
              <p>1. Cảnh báo quá tải / Giám sát không gian số</p>
              <p>2. Phân tích nguyên nhân bằng Trợ lý AI</p>
              <p>3. Lưu phiên bản kịch bản (VER-ID) & Chạy mô phỏng SimPy</p>
              <p>4. Trình Ban Giám đốc phê duyệt đề xuất có số liệu định lượng</p>
              <p>5. Điều phối nhân lực & Đánh giá hiệu quả sau can thiệp</p>
            </div>
          </div>
        </div>
      </div>

      {/* Guidance Modal when user clicks "Tạo đề xuất can thiệp" without a concrete simulation */}
      {simGuidanceRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2 text-amber-700">
                <Info className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="font-extrabold text-sm text-slate-900">Yêu cầu Chạy Mô phỏng trước khi Đề xuất</h3>
              </div>
              <button
                onClick={() => setSimGuidanceRec(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Theo quy trình thẩm định của Ban Giám đốc, đề xuất can thiệp điều phối tài nguyên cần có kết quả định lượng cụ thể từ mô hình SimPy (mã kiểm định <code>simulation_id</code>) chứng minh mức giảm thời gian chờ.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
              <span className="font-bold text-slate-800">{simGuidanceRec.title}</span>
              <p className="text-slate-600 text-[11px]">{simGuidanceRec.description}</p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => {
                  setSimGuidanceRec(null);
                  onNavigateToIntervention();
                }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium rounded-lg"
              >
                Vẫn đến Danh sách Can thiệp
              </button>
              <button
                onClick={() => {
                  const rec = simGuidanceRec;
                  setSimGuidanceRec(null);
                  handleSimulateRecommendation(rec);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-2xs"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Chuyển sang Chạy Mô phỏng ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
