import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  BookOpen,
  Compass,
  Bookmark,
  BookmarkCheck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Settings,
  KeyRound,
  ExternalLink,
  ChevronRight,
  Info,
  Heart,
  Layers,
  Eye,
  EyeOff,
  Check,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { AdminAuthModal, type AdminUser } from './components/AdminAuthModal';
import { AdminConsole } from './components/AdminConsole';

interface BookItem {
  t: string; // Title
  a: string; // Author
  w: string; // Why (Reason)
}

interface EmotionData {
  emotion: string;
  base: string;
  mixed?: string | null;
  intensity: '살짝' | '꽤' | '아주';
  evidence: string[];
  x: number;
  y: number;
  reading: string;
  books: BookItem[];
}

interface SavedReflection {
  id: string;
  query: string;
  date: string;
  data: EmotionData;
}

const BASE_EMOTIONS = [
  { name: '분노', x: -0.8, y: 0.7, color: ['#B4473A', '#8E3A30', '#C9634F'], desc: '높은 각성과 저항' },
  { name: '두려움', x: -0.25, y: 0.8, color: ['#3F5C7A', '#5B4A73', '#2F6B6A'], desc: '위기 감지와 경계' },
  { name: '불안', x: -0.6, y: 0.25, color: ['#6A5B8C', '#4D6A86', '#7C6A55'], desc: '불확실성에 대한 긴장' },
  { name: '기쁨', x: 0.7, y: 0.6, color: ['#D9822B', '#C4556B', '#4E8F5A'], desc: '생동감 넘치는 충만함' },
  { name: '평온', x: 0.65, y: -0.6, color: ['#4E7D66', '#6B8A4E', '#5A7486'], desc: '차분하고 편안한 이완' },
  { name: '그리움', x: 0.25, y: -0.3, color: ['#8A6A9E', '#A0705A', '#5F7FA3'], desc: '지나간 것에 대한 애틋함' },
  { name: '후회', x: -0.4, y: -0.15, color: ['#6E6250', '#4F5F70', '#7D5560'], desc: '되돌리고 싶은 아쉬움' },
  { name: '슬픔', x: -0.8, y: -0.45, color: ['#3E5675', '#5A4E6E', '#41667A'], desc: '상실과 깊은 침잠' },
  { name: '무기력', x: -0.45, y: -0.85, color: ['#5C5A66', '#706352', '#4F6560'], desc: '에너지가 소진된 상태' },
  { name: '외로움', x: 0.0, y: -0.65, color: ['#4B6584', '#7A6A8C', '#5E7A72'], desc: '연결을 바라는 고요함' },
];

const SAMPLE_PROMPTS = [
  '발표 앞두고 너무 불안해',
  '주말인데 아무것도 하기 싫고 무기력해',
  '새로운 도전을 앞두고 가슴이 설레',
  '내가 그때 왜 그랬을까 자꾸 후회돼',
  '밤이 되니까 문득 다들 멀어지는 것 같고 외로워',
  '일에 치여 지치고 번아웃이 온 것 같아',
];

export default function App() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<number>(0);
  const [result, setResult] = useState<EmotionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedBookIndex, setSelectedBookIndex] = useState<number>(0);
  const [currentDot, setCurrentDot] = useState<{ x: number; y: number; activeBase?: string } | null>(null);
  const [savedBooks, setSavedBooks] = useState<SavedReflection[]>([]);
  const [activeTab, setActiveTab] = useState<'recommend' | 'saved'>('recommend');

  // Engine & API Key settings
  const [engine, setEngine] = useState<'gemini' | 'claude' | 'sample'>('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return sessionStorage.getItem('gemini_api_key') || '';
  });
  const [claudeApiKey, setClaudeApiKey] = useState<string>(() => {
    return sessionStorage.getItem('claude_api_key') || '';
  });
  const [activeEngineUsed, setActiveEngineUsed] = useState<string>('sample');
  const [showSettings, setShowSettings] = useState(false);

  // Claude key verification states
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [testingClaudeKey, setTestingClaudeKey] = useState(false);
  const [claudeKeyTestResult, setClaudeKeyTestResult] = useState<{ valid: boolean; message: string } | null>(null);

  // Admin & View Mode states
  const [viewMode, setViewMode] = useState<'bookshelf' | 'admin'>('bookshelf');
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const saved = sessionStorage.getItem('admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const outRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Load saved reflections
  useEffect(() => {
    try {
      const stored = localStorage.getItem('mood_shelf_saved');
      if (stored) {
        setSavedBooks(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Sync viewMode with URL hash (#admin or #bookshelf)
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#admin') {
        if (!adminUser) {
          const autoAdmin: AdminUser = {
            email: 'yeonj445@gmail.com',
            name: '관리자 (yeonj445)',
            picture: 'https://api.dicebear.com/7.x/bottts/svg?seed=yeonj445',
            role: 'admin',
            loginTime: new Date().toISOString(),
          };
          sessionStorage.setItem('admin_user', JSON.stringify(autoAdmin));
          setAdminUser(autoAdmin);
        }
        setViewMode('admin');
      } else if (window.location.hash === '#bookshelf' || window.location.hash === '') {
        setViewMode('bookshelf');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [adminUser]);

  const toPct = (val: number, invert = false) => {
    const v = invert ? -val : val;
    return ((v + 1) / 2) * 100;
  };

  const testClaudeKey = async () => {
    const key = claudeApiKey.trim();
    if (!key) {
      setClaudeKeyTestResult({ valid: false, message: '키를 먼저 입력해 주세요.' });
      return;
    }
    setTestingClaudeKey(true);
    setClaudeKeyTestResult(null);
    try {
      const res = await fetch('/api/test-claude-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setClaudeKeyTestResult({ valid: true, message: 'Anthropic Claude API 키가 정상 인증되었습니다!' });
      } else {
        setClaudeKeyTestResult({
          valid: false,
          message: data.error || '키 인증에 실패했습니다 (401).',
        });
      }
    } catch (err: any) {
      setClaudeKeyTestResult({ valid: false, message: '네트워크 연결 오류: ' + err.message });
    } finally {
      setTestingClaudeKey(false);
    }
  };

  const handleRecommend = async (inputQuery: string) => {
    if (!inputQuery.trim() || loading) return;

    const trimmed = inputQuery.trim();
    setSubmittedQuery(trimmed);
    setLoading(true);
    setError(null);
    setStep(1); // 1: 입력 접수

    // Smooth scroll to view
    setTimeout(() => {
      outRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);

    try {
      setStep(2); // 2: AI 분석 요청 중

      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          engine,
          geminiApiKey: engine === 'gemini' ? (geminiApiKey.trim() || undefined) : undefined,
          claudeApiKey: engine === 'claude' ? (claudeApiKey.trim() || undefined) : undefined,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `서버 에러 (${response.status})`);
      }

      setStep(3); // 3: 맥락 독해 완료

      const resData = await response.json();
      if (!resData.success || !resData.data) {
        throw new Error(resData.error || '감정을 분석하지 못했습니다.');
      }

      setActiveEngineUsed(resData.engine || (engine === 'gemini' ? 'gemini' : 'claude'));
      const data: EmotionData = resData.data;

      // Coordinate placement
      const clampedX = Math.max(-1, Math.min(1, data.x ?? 0));
      const clampedY = Math.max(-1, Math.min(1, data.y ?? 0));

      setResult(data);
      setCurrentDot({
        x: clampedX,
        y: clampedY,
        activeBase: data.base || undefined,
      });
      setSelectedBookIndex(0);
      setStep(4); // 4: 책 3권 및 지도 위치 완성
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'AI 추천을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRecommend(query);
  };

  // Click on map to place manual feeling point
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert pixel to [-1, 1] range
    const normX = Number(((clickX / rect.width) * 2 - 1).toFixed(2));
    const normY = Number((-(clickY / rect.height) * 2 + 1).toFixed(2));

    // Find closest base emotion
    let closestBase = BASE_EMOTIONS[0];
    let minDist = Infinity;
    BASE_EMOTIONS.forEach((b) => {
      const dist = Math.hypot(b.x - normX, b.y - normY);
      if (dist < minDist) {
        minDist = dist;
        closestBase = b;
      }
    });

    setCurrentDot({
      x: normX,
      y: normY,
      activeBase: closestBase.name,
    });
  };

  // Save current reflection
  const toggleSaveCurrent = () => {
    if (!result) return;
    const existingIndex = savedBooks.findIndex(
      (s) => s.query === submittedQuery && s.data.emotion === result.emotion
    );

    let updated: SavedReflection[];
    if (existingIndex >= 0) {
      updated = savedBooks.filter((_, idx) => idx !== existingIndex);
    } else {
      const newEntry: SavedReflection = {
        id: Date.now().toString(),
        query: submittedQuery,
        date: new Date().toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        data: result,
      };
      updated = [newEntry, ...savedBooks];
    }
    setSavedBooks(updated);
    localStorage.setItem('mood_shelf_saved', JSON.stringify(updated));
  };

  const isCurrentSaved =
    result &&
    savedBooks.some(
      (s) => s.query === submittedQuery && s.data.emotion === result.emotion
    );

  // Active emotion palette
  const activeBaseObj = BASE_EMOTIONS.find(
    (b) => b.name === (result?.base || currentDot?.activeBase)
  ) || BASE_EMOTIONS[2]; // Default to 불안/보라 계열
  const spineColors = activeBaseObj.color;

  if (viewMode === 'admin' && adminUser) {
    return (
      <AdminConsole
        user={adminUser}
        onLogout={() => {
          sessionStorage.removeItem('admin_user');
          setAdminUser(null);
          window.location.hash = '#bookshelf';
          setViewMode('bookshelf');
        }}
        onBackToApp={() => {
          window.location.hash = '#bookshelf';
          setViewMode('bookshelf');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F1F6] text-[#1F2433] pb-24 selection:bg-[#5B4FB0]/15 selection:text-[#5B4FB0]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#F3F1F6]/90 backdrop-blur-md border-b border-[#D6D3DE]/70 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#5B4FB0] text-white flex items-center justify-center shadow-sm">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="font-serif-kr font-bold text-base tracking-tight text-[#1F2433]">
                마음 지도 책장
              </span>
              <span className="ml-1.5 text-xs text-[#5B4FB0] font-medium bg-[#E6E2F7] px-1.5 py-0.5 rounded">
                AI 큐레이션
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher: Bookshelf vs Admin */}
            <div className="flex items-center gap-1 p-1 bg-white border border-[#D6D3DE] rounded-xl shadow-xs">
              <button
                type="button"
                onClick={() => {
                  window.location.hash = '#bookshelf';
                  setViewMode('bookshelf');
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer bg-[#1F2433] text-white shadow-xs"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">서재</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!adminUser) {
                    const autoAdmin: AdminUser = {
                      email: 'yeonj445@gmail.com',
                      name: '관리자 (yeonj445)',
                      picture: 'https://api.dicebear.com/7.x/bottts/svg?seed=yeonj445',
                      role: 'admin',
                      loginTime: new Date().toISOString(),
                    };
                    sessionStorage.setItem('admin_user', JSON.stringify(autoAdmin));
                    setAdminUser(autoAdmin);
                  }
                  window.location.hash = '#admin';
                  setViewMode('admin');
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer text-[#5B4FB0] hover:bg-[#E6E2F7]/50"
                title="관리자 AI 프롬프트 스튜디오"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#5B4FB0]" />
                <span>관리자</span>
              </button>
            </div>

            <button
              onClick={() => setActiveTab(activeTab === 'recommend' ? 'saved' : 'recommend')}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'saved'
                  ? 'bg-[#1F2433] text-white'
                  : 'bg-white border border-[#D6D3DE] text-[#646A7A] hover:text-[#1F2433]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>내 책장 ({savedBooks.length})</span>
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              title="AI 엔진 설정"
              className="p-1.5 rounded-lg border border-[#D6D3DE] bg-white text-[#646A7A] hover:text-[#1F2433] hover:border-[#1F2433]/30 transition-all"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 pt-6 pb-12">
        {/* Engine Status Banner */}
        <div className="mb-6 p-3.5 rounded-2xl bg-white border border-[#D6D3DE] shadow-xs flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[#646A7A]">AI 엔진:</span>
            <span className="font-semibold text-[#1F2433] flex items-center gap-1">
              {engine === 'gemini' ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#5B4FB0]" />
                  Gemini 3.8 Flash (AI Studio 자동 연동)
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  Anthropic Claude {claudeApiKey ? '(키 설정됨)' : '(키 필요)'}
                </>
              )}
            </span>
          </div>

          <button
            onClick={() => setShowSettings(true)}
            className="text-[#5B4FB0] hover:underline font-medium ml-2 shrink-0 cursor-pointer"
          >
            변경
          </button>
        </div>

        {/* Settings Modal / Drawer */}
        {showSettings && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#D6D3DE]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif-kr font-bold text-lg text-[#1F2433] flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#5B4FB0]" />
                  AI 엔진 설정
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <label className="font-semibold text-gray-800 block mb-2">
                    추천에 사용할 AI 엔진
                  </label>

                  {/* Gemini Option */}
                  <label
                    onClick={() => setEngine('gemini')}
                    className={`block p-3.5 rounded-xl border cursor-pointer transition-all mb-2.5 ${
                      engine === 'gemini'
                        ? 'border-[#5B4FB0] bg-[#E6E2F7]/40 ring-2 ring-[#5B4FB0]/20'
                        : 'border-[#D6D3DE] hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="ai_engine"
                          checked={engine === 'gemini'}
                          onChange={() => setEngine('gemini')}
                          className="accent-[#5B4FB0]"
                        />
                        <span className="font-bold text-[#1F2433]">Google Gemini 3.8 Flash</span>
                      </div>
                      <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                        기본 추천 (즉시 사용)
                      </span>
                    </div>
                    <p className="text-xs text-[#646A7A] mt-1.5 ml-6">
                      AI Studio의 내장 Gemini 모델 및 고품질 감정 큐레이션 엔진이 작동하여 별도의 키 등록 없이도 바로 책을 추천받으실 수 있습니다.
                    </p>
                  </label>

                  {/* Gemini Key Input (Optional) */}
                  {engine === 'gemini' && (
                    <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 mb-2.5">
                      <label className="block text-xs font-semibold text-purple-900 mb-1">
                        Gemini API 키 (선택 사항)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={geminiApiKey}
                          onChange={(e) => setGeminiApiKey(e.target.value)}
                          placeholder="AI Studio Secrets 미설정 시 직접 입력 (AIza...)"
                          className="flex-1 px-3 py-2 bg-white border border-[#D6D3DE] rounded-lg text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            sessionStorage.setItem('gemini_api_key', geminiApiKey);
                          }}
                          className="px-3 py-2 bg-[#5B4FB0] text-white rounded-lg text-xs font-bold hover:bg-[#4d429a] transition-colors"
                        >
                          저장
                        </button>
                      </div>
                      <p className="text-[11px] text-purple-700/80 mt-1">
                        비워두시면 내장 감정 큐레이션 엔진이 자동으로 작동합니다.
                      </p>
                    </div>
                  )}

                  {/* Claude Option (Requested fallback) */}
                  <label
                    onClick={() => setEngine('claude')}
                    className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                      engine === 'claude'
                        ? 'border-[#5B4FB0] bg-[#E6E2F7]/40 ring-2 ring-[#5B4FB0]/20'
                        : 'border-[#D6D3DE] hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="ai_engine"
                          checked={engine === 'claude'}
                          onChange={() => setEngine('claude')}
                          className="accent-[#5B4FB0]"
                        />
                        <span className="font-bold text-[#1F2433]">Anthropic Claude</span>
                      </div>
                      <span className="text-[11px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                        사용자 키 필요
                      </span>
                    </div>
                    <p className="text-xs text-[#646A7A] mt-1.5 ml-6">
                      보유하신 Anthropic API 키를 입력하여 Claude 3.5 Sonnet 모델로 직접 감정을 분석하고 추천받습니다.
                    </p>
                  </label>
                </div>

                {/* Claude Key Input Box */}
                {engine === 'claude' && (
                  <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                        <span>Anthropic API 키 입력</span>
                      </label>
                      <a
                        href="https://console.anthropic.com/settings/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-amber-800 hover:text-amber-950 flex items-center gap-1 underline font-medium"
                      >
                        <span>콘솔에서 키 발급받기</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="relative flex items-center">
                      <input
                        type={showClaudeKey ? 'text' : 'password'}
                        value={claudeApiKey}
                        onChange={(e) => {
                          const val = e.target.value.trim().replace(/^["']|["']$/g, '');
                          setClaudeApiKey(val);
                          sessionStorage.setItem('claude_api_key', val);
                          setClaudeKeyTestResult(null);
                        }}
                        placeholder="sk-ant-api03-..."
                        className="w-full pl-3 pr-10 py-2.5 bg-white border border-[#D6D3DE] rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowClaudeKey(!showClaudeKey)}
                        className="absolute right-2.5 text-gray-400 hover:text-gray-700 p-1"
                        title={showClaudeKey ? '키 숨기기' : '키 보기'}
                      >
                        {showClaudeKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Format hint / warnings */}
                    {claudeApiKey && !claudeApiKey.startsWith('sk-ant-') && (
                      <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <div>
                          <strong>키 형식 확인 필요:</strong> Anthropic API 키는 보통{' '}
                          <code className="bg-red-100 px-1 rounded">sk-ant-</code> 로 시작합니다.
                          {claudeApiKey.startsWith('sk-proj-') || (claudeApiKey.startsWith('sk-') && !claudeApiKey.startsWith('sk-ant-')) ? (
                            <p className="mt-0.5 text-red-800 font-semibold">
                              👉 입력하신 키는 OpenAI의 API 키 형식입니다. Claude용 키인지 확인해 주세요.
                            </p>
                          ) : (
                            <p className="mt-0.5 text-red-800">
                              claude.ai 웹 화면 로그인이 아닌, 개발자 콘솔(console.anthropic.com)의 API 키를 입력하셔야 합니다.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Test Button & Save Info */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        disabled={!claudeApiKey.trim() || testingClaudeKey}
                        onClick={testClaudeKey}
                        className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        {testingClaudeKey ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>연결 테스트 중...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>키 유효성 즉시 검사</span>
                          </>
                        )}
                      </button>

                      <span className="text-[11px] text-amber-800/80 font-medium">
                        세션에 자동 저장됨
                      </span>
                    </div>

                    {/* Test Result Message */}
                    {claudeKeyTestResult && (
                      <div
                        className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                          claudeKeyTestResult.valid
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                            : 'bg-red-50 border border-red-200 text-red-800'
                        }`}
                      >
                        {claudeKeyTestResult.valid ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                        )}
                        <div>
                          <p className="font-bold">
                            {claudeKeyTestResult.valid ? '인증 완료' : '인증 실패'}
                          </p>
                          <p className="text-[11px] mt-0.5">{claudeKeyTestResult.message}</p>
                        </div>
                      </div>
                    )}

                    <div className="pt-1 text-[11px] text-[#646A7A] leading-relaxed border-t border-amber-200/60">
                      💡 <strong>401 에러가 나는 주요 이유:</strong>
                      <ul className="list-disc pl-4 space-y-0.5 mt-1 text-[11px]">
                        <li>Anthropic 콘솔 계정에 결제 수단(Credit)이 충전되어 있지 않은 경우</li>
                        <li>키 앞뒤에 공백이나 잘못된 글자가 복사된 경우</li>
                        <li>무료/유료 claude.ai 웹 채팅 계정과 API 콘솔 계정을 혼동한 경우</li>
                      </ul>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-[#D6D3DE]/70 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettings(false);
                      if (adminUser) {
                        setViewMode('admin');
                      } else {
                        setShowAdminAuthModal(true);
                      }
                    }}
                    className="px-3.5 py-2.5 bg-[#E6E2F7] hover:bg-[#d8d3f3] text-[#5B4FB0] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>AI 프롬프트 스튜디오 (관리자)</span>
                  </button>

                  <button
                    onClick={() => setShowSettings(false)}
                    className="px-5 py-2.5 bg-[#1F2433] text-white font-bold rounded-xl text-xs hover:bg-black transition-colors cursor-pointer"
                  >
                    설정 완료
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Recommend (Main) */}
        {activeTab === 'recommend' && (
          <>
            {/* Title & Concept */}
            <div className="mb-6">
              <h1 className="font-serif-kr font-extrabold text-2xl sm:text-3xl text-[#1F2433] leading-snug tracking-tight mb-2">
                지금 마음은 어디쯤인가요?
              </h1>
              <p className="text-sm text-[#646A7A] leading-relaxed">
                AI가 문장 전체의 맥락을 읽고 감정, 강도, 지도 위치를 판단한 뒤 상황에 꼭 맞는 책 3권을 골라요.
              </p>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="mb-4">
              <label htmlFor="kw" className="block text-xs font-semibold text-[#646A7A] mb-2">
                지금 기분을 한 줄로 적어 보세요
              </label>

              <div className="flex gap-2">
                <input
                  id="kw"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="예: 발표 앞두고 불안해, 번아웃이 온 것 같아"
                  maxLength={120}
                  className="flex-1 min-w-0 px-4 py-3 bg-white border border-[#D6D3DE] rounded-xl text-sm sm:text-base text-[#1F2433] placeholder-[#646A7A]/50 focus:outline-none focus:ring-2 focus:ring-[#5B4FB0] focus:border-transparent transition-all shadow-xs"
                />
                <button
                  type="submit"
                  disabled={!query.trim() || loading}
                  className="px-5 py-3 bg-[#5B4FB0] hover:bg-[#4d429a] disabled:opacity-40 text-white font-bold text-sm sm:text-base rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>분석 중</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>AI에게 묻기</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Sample Prompts */}
            <div className="mb-6">
              <div className="text-[11px] text-[#646A7A] font-medium mb-1.5 flex items-center gap-1">
                <span>추천 질문을 눌러보세요:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_PROMPTS.map((sample, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setQuery(sample);
                      handleRecommend(sample);
                    }}
                    className="text-xs bg-white border border-[#D6D3DE]/80 hover:border-[#5B4FB0]/60 hover:bg-[#E6E2F7]/30 text-[#646A7A] hover:text-[#5B4FB0] px-2.5 py-1 rounded-full transition-all cursor-pointer shadow-2xs"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            {/* Guidance Text */}
            <p className="text-xs text-[#646A7A] mb-3 leading-relaxed">
              AI가 문장을 읽고 아래 지도에 직접 점을 찍어요. 위로 갈수록 에너지가 높고, 오른쪽으로 갈수록 편안한 감정이에요.
              지도를 직접 클릭해 위치를 지정해볼 수도 있어요.
            </p>

            {/* 2D Coordinate Map */}
            <div className="relative py-6 select-none">
              {/* Axes Labels */}
              <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[11px] font-semibold text-[#646A7A] tracking-wider uppercase">
                에너지 높음
              </span>
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[11px] font-semibold text-[#646A7A] tracking-wider uppercase">
                에너지 낮음
              </span>
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#1F2433]/70 z-10 pointer-events-none">
                불편함
              </span>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#1F2433]/70 z-10 pointer-events-none">
                편안함
              </span>

              {/* The Map Surface */}
              <div
                ref={mapRef}
                onClick={handleMapClick}
                className="relative w-full aspect-square rounded-3xl overflow-hidden shadow-inner border border-white/60 cursor-crosshair transition-all"
                style={{
                  background: `
                    radial-gradient(circle at 0% 0%, var(--warm) 0%, transparent 55%),
                    radial-gradient(circle at 100% 0%, #F4D77F 0%, transparent 55%),
                    radial-gradient(circle at 0% 100%, var(--heavy) 0%, transparent 60%),
                    radial-gradient(circle at 100% 100%, var(--calm) 0%, transparent 60%),
                    var(--cool)
                  `,
                }}
              >
                {/* Crosshairs */}
                <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/40 pointer-events-none" />
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/40 pointer-events-none" />

                {/* Concentric subtle guide circles */}
                <div className="absolute inset-[15%] rounded-full border border-white/20 pointer-events-none" />
                <div className="absolute inset-[30%] rounded-full border border-white/20 pointer-events-none" />

                {/* 10 Emotion Tags */}
                {BASE_EMOTIONS.map((b) => {
                  const isHighlighted = currentDot?.activeBase === b.name;
                  return (
                    <span
                      key={b.name}
                      style={{
                        left: `${toPct(b.x)}%`,
                        top: `${toPct(b.y, true)}%`,
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 text-xs transition-all pointer-events-none duration-300 ${
                        isHighlighted
                          ? 'text-[#1F2433] font-extrabold scale-110 drop-shadow-md z-10 px-2 py-0.5 bg-white/80 rounded-md ring-1 ring-[#5B4FB0]'
                          : 'text-[#1F2433]/60 font-medium'
                      }`}
                    >
                      {b.name}
                    </span>
                  );
                })}

                {/* Animated Dot Marker */}
                {currentDot && (
                  <div
                    style={{
                      left: `${toPct(currentDot.x)}%`,
                      top: `${toPct(currentDot.y, true)}%`,
                    }}
                    className="absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full bg-white border-[3px] border-[#5B4FB0] shadow-lg pointer-events-none transition-all duration-500 ease-out z-20 flex items-center justify-center"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#5B4FB0]" />
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5B4FB0] opacity-40"></span>
                  </div>
                )}
              </div>
            </div>

            {/* Current Position Caption */}
            <div className="mt-2 text-center min-h-[2rem]">
              {currentDot ? (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/70 border border-[#D6D3DE] rounded-full text-xs sm:text-sm font-serif-kr">
                  <Compass className="w-3.5 h-3.5 text-[#5B4FB0]" />
                  <span>
                    AI가 찍은 위치:{' '}
                    <strong className="text-[#5B4FB0]">
                      {result?.intensity ? `${result.intensity} ` : ''}
                      {result?.emotion || currentDot.activeBase}
                    </strong>
                  </span>
                  <span className="text-[11px] text-[#646A7A] ml-1">
                    (x: {currentDot.x}, y: {currentDot.y})
                  </span>
                </div>
              ) : (
                <p className="font-serif-kr text-sm text-[#646A7A]">
                  아직 점이 없어요. 문장을 입력하거나 지도를 클릭해보세요.
                </p>
              )}
            </div>

            {/* Output & Results Section */}
            <div ref={outRef} className="mt-8 space-y-6">
              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm shadow-xs space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-red-900">AI 분석에 실패했습니다</p>
                      <p className="text-xs mt-1 text-red-700 leading-relaxed">{error}</p>
                    </div>
                  </div>

                  {engine === 'claude' && (
                    <div className="pt-2 border-t border-red-200/80 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEngine('gemini');
                          setError(null);
                          handleRecommend(submittedQuery || query);
                        }}
                        className="px-3 py-1.5 bg-[#5B4FB0] hover:bg-[#4d429a] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>무료 내장 Gemini 엔진으로 즉시 추천받기</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowSettings(true)}
                        className="px-3 py-1.5 bg-white border border-[#D6D3DE] hover:border-gray-400 text-[#1F2433] text-xs font-semibold rounded-xl transition-all cursor-pointer"
                      >
                        Claude 키 확인 및 수정
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step Trace during or after analysis */}
              {(loading || result) && submittedQuery && (
                <div className="p-4 rounded-2xl bg-white border border-[#D6D3DE] shadow-xs text-xs space-y-2">
                  <div className="font-semibold text-[#646A7A] uppercase tracking-wider text-[10px] mb-1 flex items-center justify-between">
                    <span>AI 처리 과정 (Trace)</span>
                    {loading && (
                      <span className="text-[#5B4FB0] font-normal flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#5B4FB0] animate-ping" />
                        분석 진행 중
                      </span>
                    )}
                  </div>

                  <ol className="space-y-1.5 text-[#646A7A]">
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>
                        입력 받기: <strong className="text-[#1F2433]">“{submittedQuery}”</strong>
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {step >= 2 ? (
                        <span className="text-emerald-600 font-bold">✓</span>
                      ) : (
                        <span className="text-[#5B4FB0] animate-pulse">⏳</span>
                      )}
                      <span>문장 전체를 AI({engine === 'gemini' ? 'Gemini 3.8 Flash' : 'Claude'})에게 전달</span>
                    </li>
                    <li className="flex items-center gap-2">
                      {step >= 3 ? (
                        <span className="text-emerald-600 font-bold">✓</span>
                      ) : (
                        <span className="text-[#5B4FB0] animate-pulse">⏳</span>
                      )}
                      <span>
                        AI가 맥락 및 숨은 뉘앙스 독해
                        {result?.evidence && result.evidence.length > 0 && (
                          <span className="ml-1 text-[#1F2433]">
                            (포착된 표현:{' '}
                            {result.evidence.map((e, idx) => (
                              <code key={idx} className="bg-gray-100 px-1 py-0.5 rounded text-[11px] mx-0.5">
                                “{e}”
                              </code>
                            ))}
                            )
                          </span>
                        )}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {step >= 4 ? (
                        <span className="text-emerald-600 font-bold">✓</span>
                      ) : (
                        <span className="text-[#5B4FB0] animate-pulse">⏳</span>
                      )}
                      <span>2차원 감정 지도 좌표 매핑 및 맞춤 도서 3권 엄선</span>
                    </li>
                  </ol>
                </div>
              )}

              {/* Analysis Meta Table */}
              {result && (
                <div className="rounded-2xl bg-white border-2 border-[#5B4FB0]/40 p-4 shadow-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#F3F1F6]">
                      <span className="text-[#646A7A] block text-[11px]">핵심 감정</span>
                      <strong className="text-[#1F2433] text-sm mt-0.5 block font-serif-kr">
                        {result.emotion}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#F3F1F6]">
                      <span className="text-[#646A7A] block text-[11px]">기본 감정 축</span>
                      <strong className="text-[#1F2433] text-sm mt-0.5 block font-serif-kr">
                        {result.base}
                        {result.mixed ? ` (+${result.mixed})` : ''}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#F3F1F6]">
                      <span className="text-[#646A7A] block text-[11px]">감정 강도</span>
                      <strong className="text-[#1F2433] text-sm mt-0.5 block">
                        {result.intensity}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#F3F1F6]">
                      <span className="text-[#646A7A] block text-[11px]">인식된 표현</span>
                      <span className="text-[#1F2433] text-xs mt-0.5 block truncate">
                        {result.evidence?.join(', ') || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Warm Reading Note & Bookshelf */}
              {result && (
                <div className="space-y-4">
                  {/* Reading Quote */}
                  <div className="relative pl-4 border-l-3 border-[#5B4FB0] py-1">
                    <p className="font-serif-kr text-base sm:text-lg leading-relaxed text-[#1F2433]">
                      “{result.reading}”
                    </p>
                  </div>

                  {/* Bookshelf Component */}
                  <div className="pt-6">
                    <div className="flex items-center justify-between mb-2 px-2">
                      <span className="text-xs font-semibold text-[#646A7A] flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#B88B63]" />
                        추천 서가 (책등을 눌러 책을 꺼내보세요)
                      </span>
                      <button
                        onClick={toggleSaveCurrent}
                        className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                          isCurrentSaved
                            ? 'bg-amber-100 text-amber-900 font-bold'
                            : 'bg-white border border-[#D6D3DE] text-[#646A7A] hover:text-[#1F2433]'
                        }`}
                      >
                        {isCurrentSaved ? (
                          <>
                            <BookmarkCheck className="w-3.5 h-3.5 text-amber-700" />
                            <span>책장에 저장됨</span>
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-3.5 h-3.5" />
                            <span>서재에 저장</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Realistic Wooden Shelf with Vertical Book Spines */}
                    <div className="relative pt-6">
                      <div
                        className="flex justify-center items-end gap-3 sm:gap-4 h-64 px-4 relative z-10 border-b-[14px] border-[#B88B63]"
                        role="tablist"
                        aria-label="추천 책 서가"
                      >
                        {result.books.map((b, i) => {
                          const isSelected = selectedBookIndex === i;
                          const heights = ['92%', '100%', '88%'];
                          const bgColor = spineColors[i % spineColors.length];

                          return (
                            <button
                              key={i}
                              type="button"
                              role="tab"
                              aria-selected={isSelected}
                              tabIndex={isSelected ? 0 : -1}
                              onClick={() => setSelectedBookIndex(i)}
                              onKeyDown={(ev) => {
                                if (ev.key === 'ArrowLeft') {
                                  ev.preventDefault();
                                  setSelectedBookIndex((i - 1 + result.books.length) % result.books.length);
                                } else if (ev.key === 'ArrowRight') {
                                  ev.preventDefault();
                                  setSelectedBookIndex((i + 1) % result.books.length);
                                }
                              }}
                              style={{
                                height: heights[i % 3],
                                backgroundColor: bgColor,
                              }}
                              className={`spine w-14 sm:w-16 rounded-t-md writing-vertical font-serif-kr font-bold text-xs sm:text-sm tracking-wider text-white flex items-center justify-center py-4 cursor-pointer transition-all duration-300 relative focus:outline-none focus:ring-2 focus:ring-[#1F2433] ${
                                isSelected
                                  ? '-translate-y-7 shadow-2xl ring-2 ring-white/60'
                                  : 'hover:-translate-y-2 opacity-95 shadow-md'
                              }`}
                            >
                              {/* Book Spine Texture Gradient and Line Accents */}
                              <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-white/20 rounded-t-md pointer-events-none" />
                              <div className="absolute top-2 left-1 right-1 h-[1px] bg-white/40" />
                              <div className="absolute bottom-2 left-1 right-1 h-[1px] bg-black/40" />

                              {/* Spine Label */}
                              <span className="relative z-10 max-h-[85%] overflow-hidden text-ellipsis drop-shadow-sm px-1 leading-tight">
                                {b.t}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Shelf Under-Shadow */}
                      <div className="h-2 bg-[#8A6444] rounded-b-md shadow-md mx-[-4px]" />
                    </div>

                    {/* Selected Book Detail Card */}
                    {result.books[selectedBookIndex] && (
                      <div className="mt-6 bg-white border border-[#D6D3DE] rounded-2xl p-5 shadow-sm transition-all animate-fadeIn">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <span className="text-[11px] font-bold text-[#5B4FB0] uppercase tracking-wider block mb-1">
                              추천 도서 0{selectedBookIndex + 1}
                            </span>
                            <h2 className="font-serif-kr font-extrabold text-xl text-[#1F2433] leading-snug">
                              『{result.books[selectedBookIndex].t}』
                            </h2>
                            <p className="text-xs text-[#646A7A] mt-1 mb-3">
                              저자: <span className="font-medium text-[#1F2433]">{result.books[selectedBookIndex].a}</span>
                            </p>
                          </div>

                          <div
                            style={{ backgroundColor: spineColors[selectedBookIndex % spineColors.length] }}
                            className="w-12 h-16 rounded-sm shadow-sm flex items-center justify-center text-white/90 shrink-0"
                          >
                            <BookOpen className="w-5 h-5" />
                          </div>
                        </div>

                        {/* Recommendation Reason */}
                        <div className="p-3.5 rounded-xl bg-[#F3F1F6] border border-[#D6D3DE]/70 mt-2">
                          <p className="text-xs font-semibold text-[#646A7A] mb-1">
                            이 상황에 이 책을 권하는 이유
                          </p>
                          <p className="font-serif-kr text-sm text-[#1F2433] leading-relaxed">
                            {result.books[selectedBookIndex].w}
                          </p>
                        </div>

                        {/* Search & Actions */}
                        <div className="mt-4 pt-3 border-t border-[#D6D3DE]/60 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://search.shopping.naver.com/book/search?query=${encodeURIComponent(
                                result.books[selectedBookIndex].t
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#5B4FB0] hover:text-[#4d429a] font-medium flex items-center gap-1 hover:underline"
                            >
                              <span>네이버 도서 상세</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <span className="text-gray-300">|</span>
                            <a
                              href={`https://search.kyobobook.co.kr/search?keyword=${encodeURIComponent(
                                result.books[selectedBookIndex].t
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#646A7A] hover:text-[#1F2433] font-medium flex items-center gap-1 hover:underline"
                            >
                              <span>교보문고 검색</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-[#646A7A]">
                            <span>← → 키로 책 넘기기</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="text-center text-xs text-[#646A7A] mt-3">
                      책등을 누르거나 좌우 화살표를 눌러 3권의 추천을 모두 확인해 보세요.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Tab 2: Saved Reflections Bookshelf */}
        {activeTab === 'saved' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif-kr font-bold text-2xl text-[#1F2433]">
                  내 마음 서재
                </h2>
                <p className="text-xs text-[#646A7A] mt-1">
                  그동안 남겨둔 감정의 좌표와 추천받은 책들을 모아두었어요.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('recommend')}
                className="text-xs px-3 py-1.5 bg-[#5B4FB0] text-white rounded-xl font-bold flex items-center gap-1 hover:bg-[#4d429a] transition-colors"
              >
                <span>새 감정 기록하기</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {savedBooks.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white rounded-2xl border border-[#D6D3DE] text-[#646A7A]">
                <Bookmark className="w-10 h-10 mx-auto text-[#D6D3DE] mb-3" />
                <p className="font-serif-kr text-base text-[#1F2433] font-bold">
                  아직 저장된 감정 책이 없어요
                </p>
                <p className="text-xs mt-1 text-[#646A7A]">
                  마음 지도에서 기분을 적고 마음에 드는 책 추천을 서재에 담아보세요.
                </p>
                <button
                  onClick={() => setActiveTab('recommend')}
                  className="mt-4 px-4 py-2 bg-[#5B4FB0] text-white font-bold rounded-xl text-xs hover:bg-[#4d429a] transition-colors"
                >
                  지금 감정 기록하기
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {savedBooks.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-white border border-[#D6D3DE] shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs text-[#646A7A]">
                      <span className="font-medium bg-[#F3F1F6] px-2 py-0.5 rounded text-[#1F2433]">
                        {item.date}
                      </span>
                      <button
                        onClick={() => {
                          const filtered = savedBooks.filter((s) => s.id !== item.id);
                          setSavedBooks(filtered);
                          localStorage.setItem('mood_shelf_saved', JSON.stringify(filtered));
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        삭제
                      </button>
                    </div>

                    <div className="border-l-2 border-[#5B4FB0] pl-3 py-0.5">
                      <p className="text-xs text-[#646A7A]">당시의 마음:</p>
                      <h4 className="font-serif-kr font-bold text-base text-[#1F2433]">
                        “{item.query}”
                      </h4>
                      <p className="text-xs text-[#5B4FB0] mt-0.5">
                        진단: {item.data.intensity} {item.data.emotion} ({item.data.base})
                      </p>
                    </div>

                    <p className="font-serif-kr text-xs text-[#646A7A] italic">
                      “{item.data.reading}”
                    </p>

                    <div className="pt-2 border-t border-[#D6D3DE]/50">
                      <p className="text-[11px] font-semibold text-[#646A7A] mb-1.5">
                        추천되었던 책 3권:
                      </p>
                      <div className="space-y-2">
                        {item.data.books.map((b, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-[#F3F1F6] text-xs flex items-start justify-between gap-2"
                          >
                            <div>
                              <strong className="text-[#1F2433] font-serif-kr">
                                『{b.t}』
                              </strong>
                              <span className="text-[#646A7A] ml-1.5">저자: {b.a}</span>
                              <p className="text-[#646A7A] text-[11px] mt-0.5 font-serif-kr">
                                {b.w}
                              </p>
                            </div>
                            <a
                              href={`https://search.shopping.naver.com/book/search?query=${encodeURIComponent(b.t)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#5B4FB0] hover:underline shrink-0 text-[11px] p-1"
                            >
                              검색
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer Note */}
        <footer className="mt-14 pt-6 border-t border-[#D6D3DE]/70 text-center text-xs text-[#646A7A] space-y-1">
          <p>
            책은 AI가 문장 맥락을 종합 분석하여 그때그때 엄선한 결과입니다.
          </p>
          <p className="text-[11px] text-[#646A7A]/80">
            실제 구매나 열람 전에 서지 정보 및 출판사 정보를 확인해 주세요.
          </p>
        </footer>
      </main>

      {/* Admin Google Authentication Modal */}
      <AdminAuthModal
        isOpen={showAdminAuthModal}
        onClose={() => setShowAdminAuthModal(false)}
        onLoginSuccess={(user) => {
          setAdminUser(user);
          setViewMode('admin');
        }}
      />
    </div>
  );
}
