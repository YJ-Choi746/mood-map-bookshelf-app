import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  Sliders,
  RotateCcw,
  Save,
  Play,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ArrowLeft,
  Cpu,
  BrainCircuit,
  MessageSquare,
  FileCode,
  Layers,
  Activity,
  Download,
  Upload,
  Copy,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Compass,
  Check,
  Zap,
  BookMarked,
  HelpCircle,
  BarChart3,
  Trash2,
  Plus,
  X,
  FileDiff,
  Clock,
  Send,
  Eye,
  CornerDownRight,
} from 'lucide-react';
import type { AdminUser } from './AdminAuthModal';

export interface AISettings {
  systemInstruction: string;
  userPromptTemplate: string;
  model: string;
  thinkingLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendationRules: {
    bookCount: number;
    language: string;
    tone: string;
    preferGenres: string[];
    excludedKeywords?: string[];
  };
  personaPreset?: string;
  lastModified?: string;
  modifiedBy?: string;
}

export interface CurationLog {
  id: string;
  timestamp: string;
  query: string;
  emotion: string;
  base: string;
  intensity: string;
  x: number;
  y: number;
  engine: string;
  books: { t: string; a: string; w: string }[];
  latencyMs?: number;
}

export interface PromptSnapshot {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  createdBy: string;
  settings: AISettings;
}

interface AdminConsoleProps {
  user: AdminUser;
  onLogout: () => void;
  onBackToApp: () => void;
}

const PERSONA_PRESETS = [
  {
    id: 'empathetic_counselor',
    name: '다정하고 따뜻한 심리 상담가 (기본 권장)',
    subtitle: '마음의 짐을 덜어주고 온기를 전하는 공감 큐레이션',
    instruction:
      '너는 마음 지도 책방의 수석 큐레이터이자 다정한 심리 상담가야. 사용자의 글에서 숨은 감정과 뉘앙스를 정확히 읽어내고, 마음을 어루만져 주는 최적의 실존 한국어판 책 3권을 골라줘.',
    tone: '다정하고 공감 어린 해요체 1문장',
    tag: '상담 & 힐링',
  },
  {
    id: 'literary_critic',
    name: '차분하고 깊이 있는 문학 평론가',
    subtitle: '인간 본성과 고전의 울림을 짚어주는 지성적 큐레이션',
    instruction:
      '너는 깊은 조예를 지닌 서재의 문학 평론가야. 사용자의 감정 상태를 차분하고 지적인 시선으로 포착하고, 인간 본성과 마음의 깊이를 탐구하는 문학적 완성도가 높은 한국어판 책 3권을 추천해줘.',
    tone: '정갈하고 깊이 있는 문어체 1문장',
    tag: '문학 & 고전',
  },
  {
    id: 'life_mentor',
    name: '단단한 용기를 북돋는 인생 멘토',
    subtitle: '시련과 방황을 딛고 일어설 수 있는 실질적 회복탄력성',
    instruction:
      '너는 오랜 삶의 지혜를 나누는 든든한 인생 멘토야. 사용자가 겪는 시련과 불안 속에서도 앞으로 나아갈 수 있는 실질적인 힘과 회복탄력성을 주는 단단한 책 3권을 골라줘.',
    tone: '따뜻하면서도 힘을 주는 신뢰감 있는 해요체 1문장',
    tag: '성장 & 동기부여',
  },
  {
    id: 'philosophical_thinker',
    name: '성찰과 깨달음을 주는 철학 큐레이터',
    subtitle: '표면적 감정을 존재론적 사색과 성찰의 기회로 전환',
    instruction:
      '너는 고요한 사색으로 인도하는 철학 큐레이터야. 사용자의 기분을 표면적인 현상이 아닌 삶의 소중한 사색의 기회로 전환하도록 이끌며, 내면을 비추어볼 수 있는 고전과 명저 3권을 골라줘.',
    tone: '여운을 남기는 사색적인 해요체 1문장',
    tag: '철학 & 사색',
  },
];

const AVAILABLE_GENRES = [
  '소설',
  '에세이',
  '인문/심리',
  '시집',
  '철학',
  '과학',
  '고전 문학',
  '예술',
];

const SAMPLE_TEST_CASES = [
  {
    category: '불안/초조',
    text: '취업 준비가 길어져서 자존감이 바닥이고 내일이 오는 게 무서워',
  },
  {
    category: '피로/번아웃',
    text: '열심히 달려왔는데 갑자기 모든 게 허무하고 아무것도 하기 싫어',
  },
  {
    category: '설렘/기대',
    text: '내일부터 새로운 도시에서 첫 출근을 시작해. 떨리지만 가슴이 뛰어',
  },
  {
    category: '외로움/고독',
    text: '퇴근하고 불 꺼진 방에 들어왔는데 세상에 나 혼자만 남겨진 기분이야',
  },
  {
    category: '평온/휴식',
    text: '주말 오후에 창밖 빗소리 들으면서 따뜻한 차 한 잔 마시고 있어',
  },
  {
    category: '분노/답답',
    text: '최선을 다했는데 내 탓으로 몰아가는 직장 상사 때문에 속이 부글부글 끓어',
  },
];

export function AdminConsole({ user, onLogout, onBackToApp }: AdminConsoleProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'persona' | 'template' | 'rules' | 'model' | 'playground' | 'backup'
  >('overview');
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  // Live Logs state
  const [curationLogs, setCurationLogs] = useState<CurationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Snapshots state
  const [snapshots, setSnapshots] = useState<PromptSnapshot[]>([]);
  const [showCreateSnapshotModal, setShowCreateSnapshotModal] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDesc, setSnapshotDesc] = useState('');
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);

  // Excluded keywords input
  const [newKeywordInput, setNewKeywordInput] = useState('');

  // Import JSON state
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // Diff viewer state
  const [showDiffModal, setShowDiffModal] = useState(false);

  // Playground state
  const [testQuery, setTestQuery] = useState(
    '취업 준비가 길어져서 자존감이 바닥이고 내일이 오는 게 무서워'
  );
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  // Health ping state
  const [pingStatus, setPingStatus] = useState<'idle' | 'checking' | 'healthy' | 'error'>('idle');
  const [pingLatency, setPingLatency] = useState<number | null>(null);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
    fetchLogs();
    fetchSnapshots();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        setOriginalSettings(JSON.parse(JSON.stringify(data.settings)));
      }
    } catch (err: any) {
      console.error(err);
      setSaveError('설정을 불러오지 못했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/admin/logs');
      const data = await res.json();
      if (data.success && data.logs) {
        setCurationLogs(data.logs);
      }
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchSnapshots = async () => {
    try {
      const res = await fetch('/api/admin/snapshots');
      const data = await res.json();
      if (data.success && data.snapshots) {
        setSnapshots(data.snapshots);
      }
    } catch (e) {
      console.error('Failed to fetch snapshots:', e);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('최근 큐레이션 활동 로그를 모두 비우시겠습니까?')) return;
    try {
      await fetch('/api/admin/logs', { method: 'DELETE' });
      setCurationLogs([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings,
          user: { email: user.email, name: user.name },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '저장에 실패했습니다.');
      }

      setSettings(data.settings);
      setOriginalSettings(JSON.parse(JSON.stringify(data.settings)));
      setSaveSuccess(true);
      fetchLogs();
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setSaveError(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        '기본 프롬프트 및 시스템 설정으로 완전히 복원하시겠습니까? (이전 커스텀 설정은 대체됩니다)'
      )
    )
      return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        setOriginalSettings(JSON.parse(JSON.stringify(data.settings)));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      }
    } catch (err: any) {
      setSaveError('초기화 실패: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRunTest = async () => {
    if (!testQuery.trim() || !settings) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/test-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: testQuery.trim(),
          settings,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTestResult({ ...data.data, latencyMs: data.latencyMs, engine: data.engine });
        fetchLogs();
      } else {
        throw new Error(data.error || '테스트 실행 실패');
      }
    } catch (err: any) {
      alert('테스트 오류: ' + err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotName.trim() || !settings) return;
    setCreatingSnapshot(true);
    try {
      const res = await fetch('/api/admin/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: snapshotName.trim(),
          description: snapshotDesc.trim(),
          settings,
          userEmail: user.email,
        }),
      });
      const data = await res.json();
      if (data.success && data.snapshots) {
        setSnapshots(data.snapshots);
        setShowCreateSnapshotModal(false);
        setSnapshotName('');
        setSnapshotDesc('');
        alert(`스냅샷 "${data.snapshot.name}"이(가) 성공적으로 저장되었습니다.`);
      } else {
        throw new Error(data.error || '스냅샷 저장 실패');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreatingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = async (snapshotId: string, snapshotTitle: string) => {
    if (!confirm(`스냅샷 "${snapshotTitle}"의 설정으로 즉시 복원하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/admin/snapshots/${snapshotId}/restore`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        setOriginalSettings(JSON.parse(JSON.stringify(data.settings)));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
        alert(`스냅샷 "${snapshotTitle}"이(가) 현재 프로덕션에 성공적으로 복원되었습니다.`);
      } else {
        throw new Error(data.error || '스냅샷 복원 실패');
      }
    } catch (err: any) {
      alert('복원 오류: ' + err.message);
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    if (!confirm('이 스냅샷을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/admin/snapshots/${snapshotId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success && data.snapshots) {
        setSnapshots(data.snapshots);
      }
    } catch (err: any) {
      alert('스냅샷 삭제 실패: ' + err.message);
    }
  };

  const handleImportJson = async () => {
    if (!importJsonText.trim()) return;
    setImportError(null);
    setImportSuccess(false);
    try {
      const res = await fetch('/api/admin/settings/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonString: importJsonText.trim(),
          userEmail: user.email,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '설정 불러오기 실패');
      }
      setSettings(data.settings);
      setOriginalSettings(JSON.parse(JSON.stringify(data.settings)));
      setImportSuccess(true);
      setImportJsonText('');
      setTimeout(() => setImportSuccess(false), 3500);
    } catch (err: any) {
      setImportError(err.message || 'JSON 유효성 검사 실패');
    }
  };

  const handleCheckPing = async () => {
    setPingStatus('checking');
    const start = performance.now();
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const latency = Math.round(performance.now() - start);
        setPingLatency(latency);
        setPingStatus('healthy');
      } else {
        setPingStatus('error');
      }
    } catch {
      setPingStatus('error');
    }
  };

  const applyPreset = (preset: (typeof PERSONA_PRESETS)[0]) => {
    if (!settings) return;
    setSettings({
      ...settings,
      personaPreset: preset.id,
      systemInstruction: preset.instruction,
      recommendationRules: {
        ...settings.recommendationRules,
        tone: preset.tone,
      },
    });
  };

  const toggleGenre = (genre: string) => {
    if (!settings) return;
    const current = settings.recommendationRules.preferGenres || [];
    const updated = current.includes(genre)
      ? current.filter((g) => g !== genre)
      : [...current, genre];
    setSettings({
      ...settings,
      recommendationRules: {
        ...settings.recommendationRules,
        preferGenres: updated,
      },
    });
  };

  const handleAddExcludedKeyword = () => {
    const kw = newKeywordInput.trim();
    if (!kw || !settings) return;
    const current = settings.recommendationRules.excludedKeywords || [];
    if (!current.includes(kw)) {
      setSettings({
        ...settings,
        recommendationRules: {
          ...settings.recommendationRules,
          excludedKeywords: [...current, kw],
        },
      });
    }
    setNewKeywordInput('');
  };

  const handleRemoveExcludedKeyword = (kwToRemove: string) => {
    if (!settings) return;
    const current = settings.recommendationRules.excludedKeywords || [];
    setSettings({
      ...settings,
      recommendationRules: {
        ...settings.recommendationRules,
        excludedKeywords: current.filter((k) => k !== kwToRemove),
      },
    });
  };

  const insertVariable = (variable: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      userPromptTemplate: settings.userPromptTemplate + ' ' + variable,
    });
  };

  const handleExportJson = () => {
    if (!settings) return;
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(settings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `mood-shelf-ai-settings-${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyJson = () => {
    if (!settings) return;
    navigator.clipboard.writeText(JSON.stringify(settings, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const hasUnsavedChanges =
    settings && originalSettings
      ? JSON.stringify(settings) !== JSON.stringify(originalSettings)
      : false;

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-[#F3F1F6] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#5B4FB0] border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="font-serif-kr font-bold text-base text-[#1F2433]">
            마음 지도 관리자 콘솔을 불러오는 중...
          </h2>
          <p className="text-xs text-[#646A7A]">
            서버 설정 파일(config/ai-settings.json)을 동기화하고 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F1F6] text-[#1F2433] pb-24 selection:bg-[#5B4FB0]/15 selection:text-[#5B4FB0]">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#F3F1F6]/95 backdrop-blur-md border-b border-[#D6D3DE] px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Brand & Return */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToApp}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#D6D3DE] hover:border-[#1F2433] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer text-[#1F2433] shadow-xs"
              title="사용자 화면으로 이동"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>서재 바로가기</span>
            </button>

            <div className="h-4 w-[1px] bg-[#D6D3DE]" />

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#5B4FB0] text-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-serif-kr font-bold text-base text-[#1F2433] tracking-tight">
                    관리자 AI 프롬프트 스튜디오
                  </h1>
                  <span className="hidden sm:inline-block text-[10px] font-mono font-bold bg-[#E6E2F7] text-[#5B4FB0] px-2 py-0.5 rounded-md">
                    ADMIN v2.5
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#646A7A]">
                  <span>
                    엔진: <strong className="text-[#5B4FB0] font-mono">{settings.model}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    추론: <strong className="text-[#1F2433] font-mono">{settings.thinkingLevel}</strong>
                  </span>
                  {hasUnsavedChanges && (
                    <>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => setShowDiffModal(true)}
                        className="text-amber-600 font-semibold hover:underline cursor-pointer flex items-center gap-1 animate-pulse"
                      >
                        <FileDiff className="w-3 h-3" />
                        <span>수정 사항 비교</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Admin User Badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white border border-[#D6D3DE] rounded-xl text-xs shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[#1F2433] font-medium">{user.email}</span>
            </div>

            {/* Logout */}
            <button
              onClick={onLogout}
              title="로그아웃"
              className="p-2 rounded-xl border border-[#D6D3DE] bg-white text-[#646A7A] hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer shadow-xs"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                hasUnsavedChanges
                  ? 'bg-[#5B4FB0] hover:bg-[#4d429a] text-white ring-2 ring-[#5B4FB0]/40'
                  : 'bg-[#1F2433] hover:bg-black text-white'
              } disabled:opacity-50`}
            >
              <Save className="w-4 h-4" />
              <span>{saving ? '저장 중...' : '서버 전체 반영'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 pt-6">
        {/* Save success toast */}
        {saveSuccess && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                설정이 서버(<code>config/ai-settings.json</code>)에 즉시 저장되었습니다. 모든
                방문자에게 실시간 적용됩니다!
              </span>
            </div>
            <span className="text-[11px] text-emerald-600">반영 완료 ✓</span>
          </div>
        )}

        {/* Save error toast */}
        {saveError && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-white border border-[#D6D3DE] rounded-2xl mb-6 overflow-x-auto text-xs font-semibold shadow-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-[#1F2433] text-white shadow-xs'
                : 'text-[#646A7A] hover:text-[#1F2433] hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>📊 운영 대시보드 & 로그</span>
          </button>

          <button
            onClick={() => setActiveTab('persona')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'persona'
                ? 'bg-[#1F2433] text-white shadow-xs'
                : 'text-[#646A7A] hover:text-[#1F2433] hover:bg-gray-50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>🎭 시스템 페르소나</span>
          </button>

          <button
            onClick={() => setActiveTab('template')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'template'
                ? 'bg-[#1F2433] text-white shadow-xs'
                : 'text-[#646A7A] hover:text-[#1F2433] hover:bg-gray-50'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>📝 프롬프트 템플릿</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'rules'
                ? 'bg-[#1F2433] text-white shadow-xs'
                : 'text-[#646A7A] hover:text-[#1F2433] hover:bg-gray-50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>📚 도서 추천 규칙 & 금지어</span>
          </button>

          <button
            onClick={() => setActiveTab('model')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'model'
                ? 'bg-[#1F2433] text-white shadow-xs'
                : 'text-[#646A7A] hover:text-[#1F2433] hover:bg-gray-50'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>⚡ 모델 & 파라미터</span>
          </button>

          <button
            onClick={() => setActiveTab('playground')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'playground'
                ? 'bg-[#5B4FB0] text-white shadow-xs'
                : 'bg-[#E6E2F7] text-[#5B4FB0] hover:bg-[#ded8f5]'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>🔬 실시간 테스트 랩</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ml-auto ${
              activeTab === 'backup'
                ? 'bg-[#1F2433] text-white shadow-xs'
                : 'text-[#646A7A] hover:text-[#1F2433] hover:bg-gray-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>💾 스냅샷 & 백업</span>
          </button>
        </div>

        {/* TAB 0: Overview Dashboard & Live Logs */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-white border border-[#D6D3DE] rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs text-[#646A7A]">
                  <span className="font-semibold">AI 모델 엔진</span>
                  <Cpu className="w-4 h-4 text-[#5B4FB0]" />
                </div>
                <div className="text-xl font-bold font-mono text-[#1F2433]">
                  {settings.model}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-emerald-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Google GenAI Live 연결됨</span>
                </div>
              </div>

              <div className="p-4 bg-white border border-[#D6D3DE] rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs text-[#646A7A]">
                  <span className="font-semibold">현재 페르소나</span>
                  <MessageSquare className="w-4 h-4 text-[#5B4FB0]" />
                </div>
                <div className="text-base font-bold font-serif-kr text-[#1F2433] truncate">
                  {PERSONA_PRESETS.find((p) => p.id === settings.personaPreset)?.name.split('(')[0] ||
                    '커스텀 페르소나'}
                </div>
                <div className="text-[11px] text-[#646A7A] truncate">
                  어조: {settings.recommendationRules.tone}
                </div>
              </div>

              <div className="p-4 bg-white border border-[#D6D3DE] rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs text-[#646A7A]">
                  <span className="font-semibold">추천 도서 정책</span>
                  <BookOpen className="w-4 h-4 text-[#5B4FB0]" />
                </div>
                <div className="text-xl font-bold text-[#1F2433]">
                  {settings.recommendationRules.bookCount}권 엄선
                </div>
                <div className="text-[11px] text-[#646A7A] truncate">
                  금지어: {(settings.recommendationRules.excludedKeywords || []).length}개 설정됨
                </div>
              </div>

              <div className="p-4 bg-white border border-[#D6D3DE] rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs text-[#646A7A]">
                  <span className="font-semibold">추론 강도 (Thinking)</span>
                  <Zap className="w-4 h-4 text-[#5B4FB0]" />
                </div>
                <div className="text-xl font-bold font-mono text-[#5B4FB0]">
                  {settings.thinkingLevel}
                </div>
                <div className="text-[11px] text-[#646A7A]">
                  {settings.thinkingLevel === 'LOW'
                    ? '초저지연 빠른 응답 모드'
                    : settings.thinkingLevel === 'MEDIUM'
                    ? '균형 잡힌 심층 분석'
                    : '철학적 심층 추론 모드'}
                </div>
              </div>
            </div>

            {/* Quick Actions & Live Health Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left 2 Cols: Pipeline Summary */}
              <div className="md:col-span-2 bg-white border border-[#D6D3DE] rounded-2xl p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif-kr font-bold text-base text-[#1F2433]">
                      현재 활성 프롬프트 구성 요약
                    </h3>
                    <p className="text-xs text-[#646A7A] mt-0.5">
                      방문자가 문장을 입력했을 때 즉시 적용되는 큐레이션 파이프라인
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasUnsavedChanges && (
                      <button
                        type="button"
                        onClick={() => setShowDiffModal(true)}
                        className="px-2.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <FileDiff className="w-3.5 h-3.5" />
                        <span>변경 내역 비교</span>
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab('playground')}
                      className="px-3 py-1.5 bg-[#E6E2F7] text-[#5B4FB0] hover:bg-[#ded8f5] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>실시간 테스트 벤치</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-[#F3F1F6] rounded-xl border border-[#D6D3DE] text-xs space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-[#5B4FB0] shrink-0 font-mono">[지침]</span>
                    <p className="text-[#1F2433] font-serif-kr line-clamp-2">
                      “{settings.systemInstruction}”
                    </p>
                  </div>
                  <div className="flex items-start gap-2 pt-1 border-t border-[#D6D3DE]/70">
                    <span className="font-bold text-[#5B4FB0] shrink-0 font-mono">[규칙]</span>
                    <p className="text-[#646A7A]">
                      한국어판 단행본 {settings.recommendationRules.bookCount}권 엄선 ·{' '}
                      {settings.recommendationRules.tone} · 우선 장르:{' '}
                      {(settings.recommendationRules.preferGenres || []).join(', ')}
                    </p>
                  </div>
                  {settings.recommendationRules.excludedKeywords &&
                    settings.recommendationRules.excludedKeywords.length > 0 && (
                      <div className="flex items-start gap-2 pt-1 border-t border-[#D6D3DE]/70">
                        <span className="font-bold text-red-600 shrink-0 font-mono">[금지어]</span>
                        <p className="text-red-700 font-medium">
                          {settings.recommendationRules.excludedKeywords.join(', ')}
                        </p>
                      </div>
                    )}
                </div>

                {/* Quick Action Buttons */}
                <div className="pt-1">
                  <h4 className="text-xs font-semibold text-[#646A7A] mb-2.5">
                    빠른 설정 작업:
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <button
                      onClick={() => setActiveTab('persona')}
                      className="p-3 rounded-xl border border-[#D6D3DE] hover:border-[#5B4FB0] hover:bg-[#E6E2F7]/30 text-left transition-all cursor-pointer bg-white"
                    >
                      <MessageSquare className="w-4 h-4 text-[#5B4FB0] mb-1.5" />
                      <strong className="text-xs block text-[#1F2433]">페르소나 변경</strong>
                      <span className="text-[10px] text-[#646A7A]">상담가/평론가 4종</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('template')}
                      className="p-3 rounded-xl border border-[#D6D3DE] hover:border-[#5B4FB0] hover:bg-[#E6E2F7]/30 text-left transition-all cursor-pointer bg-white"
                    >
                      <FileCode className="w-4 h-4 text-[#5B4FB0] mb-1.5" />
                      <strong className="text-xs block text-[#1F2433]">프롬프트 서식</strong>
                      <span className="text-[10px] text-[#646A7A]">{'{query}'} 변수 편집</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('rules')}
                      className="p-3 rounded-xl border border-[#D6D3DE] hover:border-[#5B4FB0] hover:bg-[#E6E2F7]/30 text-left transition-all cursor-pointer bg-white"
                    >
                      <Sliders className="w-4 h-4 text-[#5B4FB0] mb-1.5" />
                      <strong className="text-xs block text-[#1F2433]">추천 규칙 & 금지어</strong>
                      <span className="text-[10px] text-[#646A7A]">
                        {settings.recommendationRules.bookCount}권 · 필터링
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab('backup')}
                      className="p-3 rounded-xl border border-[#D6D3DE] hover:border-[#5B4FB0] hover:bg-[#E6E2F7]/30 text-left transition-all cursor-pointer bg-white"
                    >
                      <Layers className="w-4 h-4 text-[#5B4FB0] mb-1.5" />
                      <strong className="text-xs block text-[#1F2433]">스냅샷 & 백업</strong>
                      <span className="text-[10px] text-[#646A7A]">
                        {snapshots.length}개 스냅샷
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right 1 Col: Server Status & Ping */}
              <div className="bg-white border border-[#D6D3DE] rounded-2xl p-6 shadow-xs space-y-5">
                <div>
                  <h3 className="font-serif-kr font-bold text-base text-[#1F2433]">
                    서버 및 API 상태
                  </h3>
                  <p className="text-xs text-[#646A7A] mt-0.5">
                    Express 백엔드 및 Gemini 엔진 진단
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-[#D6D3DE]/70">
                    <span className="text-[#646A7A]">서버 설정 파일:</span>
                    <strong className="text-emerald-700 font-mono">config/ai-settings.json</strong>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-[#D6D3DE]/70">
                    <span className="text-[#646A7A]">최근 저장 일시:</span>
                    <span className="text-[#1F2433] font-medium">
                      {settings.lastModified
                        ? new Date(settings.lastModified).toLocaleDateString('ko-KR', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '기본값'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-[#D6D3DE]/70">
                    <span className="text-[#646A7A]">수정 관리자:</span>
                    <span className="text-[#1F2433] font-medium truncate max-w-[130px]">
                      {settings.modifiedBy || user.email}
                    </span>
                  </div>
                </div>

                {/* Health Ping Button */}
                <div className="pt-2">
                  <button
                    onClick={handleCheckPing}
                    disabled={pingStatus === 'checking'}
                    className="w-full py-2.5 px-3 bg-gray-50 border border-[#D6D3DE] hover:bg-gray-100 rounded-xl text-xs font-semibold text-[#1F2433] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-[#5B4FB0] ${
                        pingStatus === 'checking' ? 'animate-spin' : ''
                      }`}
                    />
                    <span>
                      {pingStatus === 'checking'
                        ? '서버 핑 확인 중...'
                        : pingStatus === 'healthy'
                        ? `정상 작동 (지연: ${pingLatency}ms)`
                        : '서버 헬스체크 실행'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Curation Activity Logs Section */}
            <div className="bg-white border border-[#D6D3DE] rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif-kr font-bold text-base text-[#1F2433] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#5B4FB0]" />
                    <span>실시간 방문자 감정 분석 & 큐레이션 활동 로그</span>
                  </h3>
                  <p className="text-xs text-[#646A7A] mt-0.5">
                    방문자 및 관리자가 요청한 최근 감정 문장, 좌표 분석 결과, 엄선 도서 3권 실시간 기록
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchLogs}
                    disabled={loadingLogs}
                    className="p-1.5 rounded-lg border border-[#D6D3DE] bg-white hover:bg-gray-50 text-xs font-medium text-[#646A7A] flex items-center gap-1 cursor-pointer"
                    title="로그 새로고침"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                    <span>새로고침</span>
                  </button>
                  {curationLogs.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearLogs}
                      className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-medium text-red-600 flex items-center gap-1 cursor-pointer"
                      title="로그 전체 비우기"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>비우기</span>
                    </button>
                  )}
                </div>
              </div>

              {curationLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#646A7A] border border-dashed border-[#D6D3DE] rounded-xl">
                  아직 기록된 큐레이션 활동이 없습니다. 서재나 테스트 벤치에서 문장을 분석해보세요.
                </div>
              ) : (
                <div className="divide-y divide-[#D6D3DE]/70 border border-[#D6D3DE] rounded-xl overflow-hidden">
                  {curationLogs.slice(0, 8).map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 sm:p-4 bg-white hover:bg-[#F3F1F6]/50 transition-colors space-y-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-[#646A7A]">
                            {new Date(log.timestamp).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                          <span className="font-serif-kr font-bold text-sm text-[#1F2433]">
                            “{log.query}”
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="font-medium bg-[#E6E2F7] text-[#5B4FB0] px-2 py-0.5 rounded">
                            {log.intensity} {log.emotion} ({log.base})
                          </span>
                          <span className="font-mono font-bold text-gray-500">
                            x={log.x.toFixed(2)}, y={log.y.toFixed(2)}
                          </span>
                          {log.latencyMs && (
                            <span className="font-mono text-emerald-600 font-semibold">
                              {log.latencyMs}ms
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 3 Books Compact Pills */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                        <span className="text-[#646A7A] font-medium shrink-0">추천 도서:</span>
                        {(log.books || []).map((b, bIdx) => (
                          <a
                            key={bIdx}
                            href={`https://search.shopping.naver.com/book/search?query=${encodeURIComponent(
                              b.t
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 bg-gray-50 hover:bg-[#E6E2F7] border border-[#D6D3DE] rounded text-[#1F2433] hover:text-[#5B4FB0] transition-colors flex items-center gap-1"
                          >
                            <strong>『{b.t}』</strong>
                            <span className="text-[#646A7A]">({b.a})</span>
                            <ExternalLink className="w-2.5 h-2.5 text-gray-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: System Persona */}
        {activeTab === 'persona' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#D6D3DE] rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="font-serif-kr font-bold text-lg text-[#1F2433]">
                  AI 북 큐레이터 페르소나 설정 (System Instruction)
                </h3>
                <p className="text-xs text-[#646A7A] mt-1 leading-relaxed">
                  Gemini 모델에게 부여하는 기본 상담자 정체성과 어조를 정의합니다. 프리셋을
                  선택하거나 문장을 직접 자유롭게 수정할 수 있습니다.
                </p>
              </div>

              {/* Persona Presets Grid */}
              <div>
                <label className="block text-xs font-semibold text-[#646A7A] mb-2.5">
                  큐레이터 프리셋 선택:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PERSONA_PRESETS.map((p) => {
                    const isSelected = settings.personaPreset === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => applyPreset(p)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#5B4FB0] bg-[#E6E2F7]/40 ring-1 ring-[#5B4FB0]'
                            : 'border-[#D6D3DE] hover:border-gray-400 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <strong className="text-xs font-bold text-[#1F2433]">{p.name}</strong>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-[#646A7A] font-medium">
                            {p.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5B4FB0] font-medium mb-1.5">{p.subtitle}</p>
                        <p className="text-[11px] text-[#646A7A] line-clamp-2 leading-relaxed">
                          {p.instruction}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Textarea Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[#1F2433]">
                    시스템 지시문 전문 편집:
                  </label>
                  <span className="text-[11px] font-mono text-[#646A7A]">
                    {settings.systemInstruction.length} 자
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={settings.systemInstruction}
                  onChange={(e) =>
                    setSettings({ ...settings, systemInstruction: e.target.value })
                  }
                  className="w-full p-4 bg-gray-50 border border-[#D6D3DE] rounded-xl text-xs sm:text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#5B4FB0] leading-relaxed"
                  placeholder="너는 마음 지도 책방의 수석 큐레이터이자 다정한 심리 상담가야..."
                />
              </div>

              <div className="p-3.5 bg-[#F3F1F6] rounded-xl border border-[#D6D3DE] text-xs text-[#646A7A] flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-[#5B4FB0] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>페르소나 팁:</strong> AI의 성향을 명확히 규정할수록 사용자가 받는 추천
                  이유(큐레이터의 말)가 훨씬 더 진정성 있고 일관되게 생성됩니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Prompt Template */}
        {activeTab === 'template' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#D6D3DE] rounded-2xl p-6 shadow-xs space-y-5">
              <div>
                <h3 className="font-serif-kr font-bold text-lg text-[#1F2433]">
                  감정 분석 & 매핑 지시문 템플릿 (User Prompt Template)
                </h3>
                <p className="text-xs text-[#646A7A] mt-1 leading-relaxed">
                  사용자 문장을 받았을 때 AI에게 전달되는 프롬프트의 골격입니다. 변수 태그를 클릭하면
                  프롬프트 끝에 자동으로 삽입됩니다.
                </p>
              </div>

              {/* Dynamic Variable Chips */}
              <div className="flex flex-wrap items-center gap-2 p-3.5 bg-gray-50 rounded-xl border border-[#D6D3DE]/70 text-xs">
                <span className="font-semibold text-[#1F2433]">변수 삽입 (클릭):</span>
                <button
                  type="button"
                  onClick={() => insertVariable('{query}')}
                  className="px-2.5 py-1 bg-white hover:bg-[#E6E2F7] border border-[#D6D3DE] hover:border-[#5B4FB0] font-mono rounded-lg text-[#5B4FB0] font-bold cursor-pointer transition-colors"
                >
                  + {'{query}'}
                </button>
                <span className="text-[#646A7A] text-[11px] mr-2">
                  (사용자가 입력한 기분 문장)
                </span>

                <button
                  type="button"
                  onClick={() => insertVariable('{bases}')}
                  className="px-2.5 py-1 bg-white hover:bg-[#E6E2F7] border border-[#D6D3DE] hover:border-[#5B4FB0] font-mono rounded-lg text-[#5B4FB0] font-bold cursor-pointer transition-colors"
                >
                  + {'{bases}'}
                </button>
                <span className="text-[#646A7A] text-[11px]">(10대 기본 감정 축 목록)</span>
              </div>

              {/* Prompt Text Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[#1F2433]">
                    프롬프트 서식 에디터:
                  </label>
                  <span className="text-[11px] font-mono text-[#646A7A]">
                    {settings.userPromptTemplate.length} 자
                  </span>
                </div>
                <textarea
                  rows={13}
                  value={settings.userPromptTemplate}
                  onChange={(e) =>
                    setSettings({ ...settings, userPromptTemplate: e.target.value })
                  }
                  className="w-full p-4 bg-gray-50 border border-[#D6D3DE] rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#5B4FB0] leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Recommendation Rules & Blacklist */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#D6D3DE] rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="font-serif-kr font-bold text-lg text-[#1F2433]">
                  도서 추천 규칙 & 금지어 필터 (Policy & Blacklist)
                </h3>
                <p className="text-xs text-[#646A7A] mt-1 leading-relaxed">
                  추천 권수, 출판 요건, 큐레이터 어조 및 엄격 제외할 금지어/유해 요소를
                  세밀하게 통제합니다.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Book count */}
                <div className="p-4 rounded-xl bg-gray-50 border border-[#D6D3DE]/70 space-y-2">
                  <label className="block text-xs font-semibold text-[#1F2433]">
                    추천 도서 권수:
                  </label>
                  <select
                    value={settings.recommendationRules.bookCount}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        recommendationRules: {
                          ...settings.recommendationRules,
                          bookCount: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full p-2.5 bg-white border border-[#D6D3DE] rounded-lg text-xs font-medium cursor-pointer"
                  >
                    <option value={3}>3권 (기본 권장 - 감정 책장 밸런스 최적)</option>
                    <option value={2}>2권 (심플형)</option>
                    <option value={4}>4권 (풍부형)</option>
                    <option value={5}>5권 (컬렉션형)</option>
                  </select>
                </div>

                {/* Language / Edition criteria */}
                <div className="p-4 rounded-xl bg-gray-50 border border-[#D6D3DE]/70 space-y-2">
                  <label className="block text-xs font-semibold text-[#1F2433]">
                    도서 출간 기준:
                  </label>
                  <input
                    type="text"
                    value={settings.recommendationRules.language}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        recommendationRules: {
                          ...settings.recommendationRules,
                          language: e.target.value,
                        },
                      })
                    }
                    placeholder="실존 한국어판 단행본 필수"
                    className="w-full p-2.5 bg-white border border-[#D6D3DE] rounded-lg text-xs font-medium"
                  />
                </div>
              </div>

              {/* Tone guideline */}
              <div className="p-4 rounded-xl bg-gray-50 border border-[#D6D3DE]/70 space-y-2">
                <label className="block text-xs font-semibold text-[#1F2433]">
                  추천 사유 문체 / 어조 가이드:
                </label>
                <input
                  type="text"
                  value={settings.recommendationRules.tone}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      recommendationRules: {
                        ...settings.recommendationRules,
                        tone: e.target.value,
                      },
                    })
                  }
                  placeholder="다정하고 공감 어린 해요체 1문장"
                  className="w-full p-2.5 bg-white border border-[#D6D3DE] rounded-lg text-xs font-medium"
                />
              </div>

              {/* Prefer genres */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2433] mb-2.5">
                  우선 추천 장르 (클릭하여 켜기/끄기):
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_GENRES.map((genre) => {
                    const isSelected = settings.recommendationRules.preferGenres?.includes(genre);
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => toggleGenre(genre)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#5B4FB0] text-white shadow-xs'
                            : 'bg-white border border-[#D6D3DE] text-[#646A7A] hover:border-gray-400'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {genre}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Excluded Keywords (Blacklist) Section */}
              <div className="pt-4 border-t border-[#D6D3DE]">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-red-700 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>엄격 제외 도서 / 금지 키워드 관리 (Blacklist)</span>
                  </label>
                  <span className="text-[11px] text-[#646A7A]">
                    프롬프트에 강제 금지 항목으로 주입됩니다
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-3 p-3 bg-red-50/50 rounded-xl border border-red-200">
                  {(settings.recommendationRules.excludedKeywords || []).map((kw) => (
                    <span
                      key={kw}
                      className="px-2.5 py-1 bg-white border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-1 shadow-2xs"
                    >
                      <span>{kw}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExcludedKeyword(kw)}
                        className="hover:text-red-900 cursor-pointer p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                  {(settings.recommendationRules.excludedKeywords || []).length === 0 && (
                    <span className="text-xs text-red-400">설정된 제외 키워드가 없습니다.</span>
                  )}
                </div>

                {/* Add new excluded keyword */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKeywordInput}
                    onChange={(e) => setNewKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddExcludedKeyword();
                      }
                    }}
                    placeholder="제외할 키워드 입력 (예: 문제집, 19금, 투자/주식 등)"
                    className="flex-1 px-3 py-2 bg-gray-50 border border-[#D6D3DE] rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddExcludedKeyword}
                    className="px-4 py-2 bg-[#1F2433] hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>금지어 추가</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Model & Reasoning */}
        {activeTab === 'model' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#D6D3DE] rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="font-serif-kr font-bold text-lg text-[#1F2433]">
                  Gemini 모델 및 추론 파라미터 (Model & Thinking)
                </h3>
                <p className="text-xs text-[#646A7A] mt-1 leading-relaxed">
                  감정 분석의 세밀함과 모델 응답 속도 사이의 밸런스를 조절합니다.
                </p>
              </div>

              {/* Model Choice */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2433] mb-2.5">
                  사용할 Gemini 모델:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setSettings({ ...settings, model: 'gemini-3.8-flash' })}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      settings.model === 'gemini-3.8-flash'
                        ? 'border-[#5B4FB0] bg-[#E6E2F7]/40 ring-1 ring-[#5B4FB0]'
                        : 'border-[#D6D3DE] bg-white hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-sm font-bold text-[#1F2433] font-mono">
                        gemini-3.8-flash
                      </strong>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        기본 권장
                      </span>
                    </div>
                    <p className="text-xs text-[#646A7A] mt-1.5 leading-relaxed">
                      최고 수준의 한국어 문맥 이해력과 빠른 응답 속도를 자랑하는 최신 플래시 모델.
                    </p>
                  </div>

                  <div
                    onClick={() => setSettings({ ...settings, model: 'gemini-3.1-flash-lite' })}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      settings.model === 'gemini-3.1-flash-lite'
                        ? 'border-[#5B4FB0] bg-[#E6E2F7]/40 ring-1 ring-[#5B4FB0]'
                        : 'border-[#D6D3DE] bg-white hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-sm font-bold text-[#1F2433] font-mono">
                        gemini-3.1-flash-lite
                      </strong>
                      <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                        초경량
                      </span>
                    </div>
                    <p className="text-xs text-[#646A7A] mt-1.5 leading-relaxed">
                      초저지연 경량 모델로 빠른 키워드 위주의 분류와 가벼운 추천에 적합.
                    </p>
                  </div>
                </div>
              </div>

              {/* Thinking Level */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2433] mb-2.5">
                  추론 강도 (Thinking Level):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      level: 'LOW',
                      name: 'LOW (기본 권장)',
                      desc: '지연 시간을 최소화하여 1~2초 내에 직관적인 감정 좌표 산출',
                    },
                    {
                      level: 'MEDIUM',
                      name: 'MEDIUM',
                      desc: '복잡한 감정의 얽힘과 인과관계를 균형 있게 추론',
                    },
                    {
                      level: 'HIGH',
                      name: 'HIGH',
                      desc: '철학적, 문학적 깊이의 최대 사색 추론 적용',
                    },
                  ].map((item) => (
                    <div
                      key={item.level}
                      onClick={() =>
                        setSettings({
                          ...settings,
                          thinkingLevel: item.level as 'LOW' | 'MEDIUM' | 'HIGH',
                        })
                      }
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        settings.thinkingLevel === item.level
                          ? 'border-[#5B4FB0] bg-[#E6E2F7]/40 ring-1 ring-[#5B4FB0]'
                          : 'border-[#D6D3DE] bg-white hover:border-gray-400'
                      }`}
                    >
                      <strong className="text-xs font-bold text-[#1F2433] block">
                        {item.name}
                      </strong>
                      <p className="text-[11px] text-[#646A7A] mt-1 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Interactive Playground */}
        {activeTab === 'playground' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#D6D3DE] rounded-2xl p-6 shadow-xs space-y-5">
              <div>
                <h3 className="font-serif-kr font-bold text-lg text-[#1F2433]">
                  실시간 AI 프롬프트 테스트 랩 (Live Playground)
                </h3>
                <p className="text-xs text-[#646A7A] mt-1 leading-relaxed">
                  수정한 프롬프트와 파라미터를 프로덕션에 저장하기 전에, 실시간으로 임의의 문장을
                  넣어 감정 좌표와 도서 3권 큐레이션을 미리 확인해보세요.
                </p>
              </div>

              {/* Test Input Form */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#646A7A]">
                  시험할 감정 문장:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder="예: 취업 준비가 길어져서 자존감이 바닥이고 불안해"
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-[#D6D3DE] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4FB0]"
                  />
                  <button
                    type="button"
                    onClick={handleRunTest}
                    disabled={!testQuery.trim() || testing}
                    className="px-5 py-2.5 bg-[#5B4FB0] hover:bg-[#4d429a] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    <span>{testing ? '실행 중...' : '테스트 실행'}</span>
                  </button>
                </div>
              </div>

              {/* Sample Chips */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-[#646A7A] block font-semibold">
                  상황별 예시 문장 선택:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_TEST_CASES.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTestQuery(item.text)}
                      className="text-[11px] bg-gray-100 hover:bg-[#E6E2F7] text-[#646A7A] hover:text-[#5B4FB0] px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-left"
                    >
                      <span className="font-bold text-[#5B4FB0] mr-1">[{item.category}]</span>
                      <span>{item.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Test Results */}
              {testResult && (
                <div className="mt-6 pt-5 border-t border-[#D6D3DE] space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif-kr font-bold text-sm text-[#1F2433] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#5B4FB0]" />
                      <span>테스트 실행 결과</span>
                      {testResult.latencyMs && (
                        <span className="text-[11px] font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded ml-1">
                          {testResult.latencyMs}ms 소요
                        </span>
                      )}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowRawJson(!showRawJson)}
                      className="text-xs text-[#5B4FB0] hover:underline font-mono cursor-pointer"
                    >
                      {showRawJson ? '카드 뷰 보기' : 'JSON 원문 보기'}
                    </button>
                  </div>

                  {showRawJson ? (
                    <pre className="p-4 bg-gray-900 text-gray-100 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  ) : (
                    <div className="space-y-4">
                      {/* Emotion & Map coordinates card */}
                      <div className="p-4 bg-[#F3F1F6] rounded-xl border border-[#D6D3DE] flex flex-wrap items-center justify-between gap-4 text-xs">
                        <div>
                          <span className="text-[#646A7A] text-[11px] block">분석된 핵심 감정:</span>
                          <strong className="text-base text-[#1F2433] font-serif-kr">
                            {testResult.intensity} {testResult.emotion} ({testResult.base})
                          </strong>
                          {testResult.mixed && (
                            <span className="text-xs text-[#646A7A] ml-2">
                              부차 감정: {testResult.mixed}
                            </span>
                          )}
                        </div>
                        <div className="text-right font-mono text-[#5B4FB0] font-bold text-sm">
                          좌표: x={testResult.x}, y={testResult.y}
                        </div>
                      </div>

                      {/* 2D Mini Coordinate Visualizer */}
                      <div className="p-4 bg-white rounded-xl border border-[#D6D3DE] space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-[#646A7A]">
                            2차원 감정 좌표 시각화:
                          </span>
                          <span className="text-gray-400">
                            가로축: 불편(-1) ~ 편안(+1) / 세로축: 침체(-1) ~ 각성(+1)
                          </span>
                        </div>
                        <div className="relative w-full h-40 bg-gray-50 border border-dashed border-[#D6D3DE] rounded-xl overflow-hidden flex items-center justify-center">
                          {/* Quadrant Tint Backgrounds */}
                          <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-amber-50/20" />
                          <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-rose-50/20" />
                          <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-blue-50/20" />
                          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-emerald-50/20" />

                          {/* Axes */}
                          <div className="absolute inset-x-0 top-1/2 h-[1px] bg-gray-300" />
                          <div className="absolute inset-y-0 left-1/2 w-[1px] bg-gray-300" />

                          {/* Quadrant Labels */}
                          <span className="absolute left-2 top-2 text-[10px] font-medium text-rose-500">
                            2사분면: 고에너지 부정 (분노/불안)
                          </span>
                          <span className="absolute right-2 top-2 text-[10px] font-medium text-amber-600">
                            1사분면: 고에너지 긍정 (기쁨/설렘)
                          </span>
                          <span className="absolute left-2 bottom-2 text-[10px] font-medium text-blue-500">
                            3사분면: 저에너지 부정 (슬픔/무기력)
                          </span>
                          <span className="absolute right-2 bottom-2 text-[10px] font-medium text-emerald-600">
                            4사분면: 저에너지 긍정 (평온/안도)
                          </span>

                          {/* Pin */}
                          <div
                            className="absolute w-5 h-5 rounded-full bg-[#5B4FB0] text-white flex items-center justify-center text-xs shadow-lg transform -translate-x-1/2 -translate-y-1/2 animate-bounce ring-4 ring-[#5B4FB0]/30"
                            style={{
                              left: `${((testResult.x + 1) / 2) * 100}%`,
                              top: `${((1 - testResult.y) / 2) * 100}%`,
                            }}
                          >
                            📍
                          </div>
                        </div>
                      </div>

                      {/* Reading note */}
                      <div className="p-4 bg-white rounded-xl border-l-3 border-[#5B4FB0] shadow-xs text-xs sm:text-sm font-serif-kr text-[#1F2433] leading-relaxed">
                        “{testResult.reading}”
                      </div>

                      {/* 3 Books Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        {(testResult.books || []).map((b: any, i: number) => (
                          <div
                            key={i}
                            className="p-3.5 bg-white border border-[#D6D3DE] rounded-xl text-xs space-y-1.5 shadow-xs flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-[#5B4FB0] font-mono">
                                  추천 0{i + 1}
                                </span>
                                <a
                                  href={`https://search.shopping.naver.com/book/search?query=${encodeURIComponent(
                                    b.t
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-[#5B4FB0] hover:underline flex items-center gap-0.5"
                                >
                                  <span>네이버 검색</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                              <strong className="font-serif-kr text-sm text-[#1F2433] block truncate mt-1">
                                『{b.t}』
                              </strong>
                              <p className="text-[11px] text-[#646A7A]">저자: {b.a}</p>
                              <p className="text-[11px] text-[#1F2433] mt-1 font-serif-kr line-clamp-3 leading-relaxed">
                                {b.w}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: Snapshots & Backup */}
        {activeTab === 'backup' && (
          <div className="space-y-6">
            {/* Snapshots Management */}
            <div className="bg-white border border-[#D6D3DE] rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif-kr font-bold text-lg text-[#1F2433]">
                    버전 스냅샷 보관소 (Prompt Snapshots)
                  </h3>
                  <p className="text-xs text-[#646A7A] mt-0.5">
                    검증된 프롬프트와 추천 설정을 스냅샷으로 보관하고 필요할 때 언제든 원클릭으로
                    복원하세요.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCreateSnapshotModal(true)}
                  className="px-3.5 py-2 bg-[#5B4FB0] hover:bg-[#4d429a] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>현재 설정을 새 스냅샷으로 저장</span>
                </button>
              </div>

              {/* Snapshots Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-4 rounded-xl border border-[#D6D3DE] bg-gray-50/50 hover:bg-white hover:border-[#5B4FB0]/40 transition-all space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-sm font-bold text-[#1F2433] font-serif-kr">
                        {snap.name}
                      </strong>
                      <span className="text-[10px] font-mono text-[#646A7A] bg-white border border-[#D6D3DE] px-2 py-0.5 rounded">
                        {new Date(snap.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </div>

                    <p className="text-xs text-[#646A7A] line-clamp-2 leading-relaxed">
                      {snap.description || '메모 없음'}
                    </p>

                    <div className="text-[11px] text-[#5B4FB0] font-medium pt-1 border-t border-[#D6D3DE]/70 flex items-center justify-between">
                      <span>
                        모델: {snap.settings.model} · {snap.settings.thinkingLevel} ·{' '}
                        {snap.settings.recommendationRules?.bookCount || 3}권
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRestoreSnapshot(snap.id, snap.name)}
                          className="px-2.5 py-1 bg-white hover:bg-[#E6E2F7] border border-[#D6D3DE] text-[#5B4FB0] rounded text-xs font-bold transition-colors cursor-pointer"
                        >
                          복원하기
                        </button>
                        {snap.id !== 'snap_counselor_v1' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSnapshot(snap.id)}
                            className="p-1 hover:text-red-600 text-gray-400 transition-colors cursor-pointer"
                            title="스냅샷 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Direct JSON Import / Export Section */}
            <div className="bg-white border border-[#D6D3DE] rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="font-serif-kr font-bold text-lg text-[#1F2433]">
                  JSON 설정 내보내기 & 직접 불러오기 (Import / Export)
                </h3>
                <p className="text-xs text-[#646A7A] mt-1 leading-relaxed">
                  설정 파일을 다운로드하거나 외부에서 작성한 JSON 설정을 붙여넣어 즉시 반영할 수
                  있습니다.
                </p>
              </div>

              {/* Import Textbox */}
              <div className="p-4 rounded-xl bg-gray-50 border border-[#D6D3DE] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1F2433] flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-[#5B4FB0]" />
                    <span>JSON 설정 붙여넣어 가져오기:</span>
                  </label>
                  {importSuccess && (
                    <span className="text-xs text-emerald-600 font-bold">
                      ✓ 성공적으로 불러와 적용되었습니다!
                    </span>
                  )}
                </div>

                {importError && (
                  <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                    {importError}
                  </div>
                )}

                <textarea
                  rows={4}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder="예: { &quot;systemInstruction&quot;: &quot;...&quot;, &quot;userPromptTemplate&quot;: &quot;...&quot; }"
                  className="w-full p-3 bg-white border border-[#D6D3DE] rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#5B4FB0]"
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleImportJson}
                    disabled={!importJsonText.trim()}
                    className="px-4 py-2 bg-[#1F2433] hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>JSON 검증 및 설정 적용</span>
                  </button>
                </div>
              </div>

              {/* Export and Copy Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-[#D6D3DE] space-y-2">
                  <strong className="text-xs font-bold text-[#1F2433] block">
                    설정 파일 다운로드
                  </strong>
                  <p className="text-xs text-[#646A7A]">
                    현재 설정을 <code>mood-shelf-ai-settings.json</code> 파일로 다운로드합니다.
                  </p>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="w-full py-2 bg-white border border-[#D6D3DE] hover:border-[#5B4FB0] text-[#1F2433] font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#5B4FB0]" />
                    <span>JSON 다운로드</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-[#D6D3DE] space-y-2">
                  <strong className="text-xs font-bold text-[#1F2433] block">
                    클립보드에 복사
                  </strong>
                  <p className="text-xs text-[#646A7A]">
                    현재 설정 JSON 텍스트를 원클릭으로 클립보드에 복사합니다.
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="w-full py-2 bg-white border border-[#D6D3DE] hover:border-[#5B4FB0] text-[#1F2433] font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">복사 완료!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#5B4FB0]" />
                        <span>JSON 클립보드 복사</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Factory Reset */}
              <div className="p-4 rounded-xl bg-red-50/60 border border-red-200 space-y-2">
                <div className="flex items-center gap-2 text-red-700">
                  <RotateCcw className="w-4 h-4" />
                  <strong className="text-xs font-bold">공장 초기값 복원 (Factory Reset)</strong>
                </div>
                <p className="text-xs text-red-600 leading-relaxed">
                  임의로 수정한 모든 프롬프트, 어조, 도서 규칙을 처음 설치 당시의 안전한 기본
                  권장값으로 완전히 되돌립니다.
                </p>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={saving}
                  className="py-2 px-3.5 bg-white border border-red-300 hover:bg-red-50 text-red-700 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-red-600" />
                  <span>기본 안전 설정으로 전체 복원</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Footer Actions */}
        <div className="mt-8 pt-6 border-t border-[#D6D3DE] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#646A7A]">
            <span>
              현재 세션 관리자: <strong>{user.email}</strong>
            </span>
            {hasUnsavedChanges && (
              <span className="ml-2 text-amber-600 font-semibold">(수정 사항이 있습니다)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackToApp}
              className="px-4 py-2 rounded-xl bg-white border border-[#D6D3DE] hover:bg-gray-50 text-xs font-semibold text-[#1F2433] cursor-pointer shadow-xs"
            >
              서재 닫기
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                hasUnsavedChanges
                  ? 'bg-[#5B4FB0] hover:bg-[#4d429a] text-white ring-2 ring-[#5B4FB0]/40'
                  : 'bg-[#1F2433] hover:bg-black text-white'
              } disabled:opacity-50`}
            >
              <Save className="w-4 h-4" />
              <span>{saving ? '저장 중...' : '프로덕션 반영 및 저장'}</span>
            </button>
          </div>
        </div>
      </main>

      {/* Snapshot Creation Modal */}
      {showCreateSnapshotModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#D6D3DE] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#D6D3DE]">
              <h3 className="font-serif-kr font-bold text-base text-[#1F2433]">
                새 버전 스냅샷 만들기
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateSnapshotModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSnapshot} className="py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1F2433] mb-1">
                  스냅샷 이름:
                </label>
                <input
                  type="text"
                  required
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  placeholder="예: 가을 감성 큐레이션 v2.0"
                  className="w-full px-3 py-2 bg-gray-50 border border-[#D6D3DE] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2433] mb-1">
                  설명 및 메모 (선택):
                </label>
                <textarea
                  rows={3}
                  value={snapshotDesc}
                  onChange={(e) => setSnapshotDesc(e.target.value)}
                  placeholder="예: 공감 문체를 더욱 부드럽게 다듬고 시집 비중을 확대한 설정"
                  className="w-full px-3 py-2 bg-gray-50 border border-[#D6D3DE] rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D6D3DE]">
                <button
                  type="button"
                  onClick={() => setShowCreateSnapshotModal(false)}
                  className="px-3 py-1.5 border border-[#D6D3DE] rounded-xl text-xs font-semibold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={creatingSnapshot}
                  className="px-4 py-1.5 bg-[#5B4FB0] text-white rounded-xl text-xs font-bold"
                >
                  {creatingSnapshot ? '저장 중...' : '스냅샷 생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diff Viewer Modal */}
      {showDiffModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#D6D3DE] max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#D6D3DE]">
              <div className="flex items-center gap-2 text-[#5B4FB0]">
                <FileDiff className="w-5 h-5" />
                <h3 className="font-serif-kr font-bold text-base text-[#1F2433]">
                  현재 변경 내역 비교 (Diff Viewer)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDiffModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Persona instruction diff */}
              {settings.systemInstruction !== originalSettings?.systemInstruction && (
                <div className="p-3 rounded-xl bg-gray-50 border border-[#D6D3DE] space-y-2">
                  <strong className="text-[#1F2433] block">시스템 페르소나 지시문 변경</strong>
                  <div className="p-2 bg-red-50 text-red-800 rounded font-serif-kr">
                    <span className="font-bold mr-1">이전:</span>
                    {originalSettings?.systemInstruction}
                  </div>
                  <div className="p-2 bg-emerald-50 text-emerald-800 rounded font-serif-kr">
                    <span className="font-bold mr-1">현재:</span>
                    {settings.systemInstruction}
                  </div>
                </div>
              )}

              {/* Model & Thinking diff */}
              {(settings.model !== originalSettings?.model ||
                settings.thinkingLevel !== originalSettings?.thinkingLevel) && (
                <div className="p-3 rounded-xl bg-gray-50 border border-[#D6D3DE] space-y-1">
                  <strong className="text-[#1F2433] block">모델 및 추론 강도 변경</strong>
                  <p>
                    모델: <span className="line-through text-red-500 mr-2">{originalSettings?.model}</span>
                    <strong className="text-emerald-700">{settings.model}</strong>
                  </p>
                  <p>
                    추론: <span className="line-through text-red-500 mr-2">{originalSettings?.thinkingLevel}</span>
                    <strong className="text-emerald-700">{settings.thinkingLevel}</strong>
                  </p>
                </div>
              )}

              {/* Book count & genres diff */}
              {JSON.stringify(settings.recommendationRules) !==
                JSON.stringify(originalSettings?.recommendationRules) && (
                <div className="p-3 rounded-xl bg-gray-50 border border-[#D6D3DE] space-y-1">
                  <strong className="text-[#1F2433] block">추천 규칙 및 장르/금지어 변경</strong>
                  <p>권수: {settings.recommendationRules.bookCount}권</p>
                  <p>어조: {settings.recommendationRules.tone}</p>
                  <p>장르: {(settings.recommendationRules.preferGenres || []).join(', ')}</p>
                  <p className="text-red-700">
                    금지어: {(settings.recommendationRules.excludedKeywords || []).join(', ')}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#D6D3DE] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDiffModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#1F2433] rounded-xl text-xs font-semibold cursor-pointer"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiffModal(false);
                  handleSave();
                }}
                className="px-4 py-2 bg-[#5B4FB0] hover:bg-[#4d429a] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                이대로 전체 반영
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
