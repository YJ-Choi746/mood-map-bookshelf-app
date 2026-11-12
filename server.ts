import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

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

const DEFAULT_AI_SETTINGS: AISettings = {
  systemInstruction:
    '너는 마음 지도 책방의 수석 큐레이터이자 다정한 심리 상담가야. 사용자의 글에서 숨은 감정과 뉘앙스를 정확히 읽어내고, 마음을 어루만져 주는 최적의 실존 한국어판 책 3권을 골라줘.',
  userPromptTemplate: `사용자가 작성한 문장: """{query}"""

1. 문장 전체의 맥락(상황, 심리적 부담, 안도감, 피로, 억눌린 감정 등)을 세심하게 파악해.
2. 핵심 감정 명칭과 기본 감정 10가지 [{bases}] 중 가장 알맞은 하나를 선택해.
3. 2차원 감정 좌표를 계산해.
   - x: -1.0 (불편함, 고통, 부정적 감정) ~ 1.0 (편안함, 안도, 긍정적 감정)
   - y: -1.0 (낮은 활력, 무기력, 다운된 에너지) ~ 1.0 (높은 활력, 격앙, 각성된 에너지)
4. 사용자의 현재 마음 상태와 상황에 진정으로 도움이 되고 위로 또는 자극을 줄 수 있는 실존 한국어판 단행본 3권을 엄선해.
   - 실제로 한국어로 번역/출판된 유명하고 검증된 도서 위주로 선정 (소설, 에세이, 인문/심리, 시집 등).
   - 각 책마다 왜 지금 이 사용자에게 추천하는지 다정하고 공감 어린 해요체 1문장으로 적어줘.`,
  model: 'gemini-3.8-flash',
  thinkingLevel: 'LOW',
  recommendationRules: {
    bookCount: 3,
    language: '실존 한국어판 단행본 필수',
    tone: '다정하고 공감 어린 해요체 1문장',
    preferGenres: ['소설', '에세이', '인문/심리', '시집'],
    excludedKeywords: ['수험서/학습참고서', '19세미만/선정성 도서'],
  },
  personaPreset: 'empathetic_counselor',
  lastModified: new Date().toISOString(),
  modifiedBy: 'system_default',
};

const CONFIG_PATH = path.join(__dirname, 'config', 'ai-settings.json');
const SNAPSHOTS_PATH = path.join(__dirname, 'config', 'snapshots.json');
const LOGS_PATH = path.join(__dirname, 'config', 'curation-logs.json');

function loadAISettings(): AISettings {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('Failed to read ai-settings.json, using defaults:', err);
  }
  return DEFAULT_AI_SETTINGS;
}

let activeAISettings: AISettings = loadAISettings();

function saveAISettings(settings: AISettings): boolean {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(settings, null, 2), 'utf-8');
    activeAISettings = settings;
    return true;
  } catch (err) {
    console.error('Failed to save ai-settings.json:', err);
    return false;
  }
}

function loadSnapshots(): PromptSnapshot[] {
  try {
    if (fs.existsSync(SNAPSHOTS_PATH)) {
      return JSON.parse(fs.readFileSync(SNAPSHOTS_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load snapshots:', e);
  }
  return [
    {
      id: 'snap_counselor_v1',
      name: '기본 다정한 상담가 (v1.0)',
      description: '초기 기본 탑재된 공감형 심리 상담 페르소나 및 3권 추천 규칙',
      createdAt: new Date().toISOString(),
      createdBy: 'system_default',
      settings: DEFAULT_AI_SETTINGS,
    },
    {
      id: 'snap_literary_v1',
      name: '문학 평론가 지성 큐레이션 (v1.0)',
      description: '인간 본성과 고전 문학의 깊이를 탐구하는 정갈한 지성적 큐레이션',
      createdAt: new Date().toISOString(),
      createdBy: 'system_default',
      settings: {
        ...DEFAULT_AI_SETTINGS,
        personaPreset: 'literary_critic',
        systemInstruction:
          '너는 깊은 조예를 지닌 서재의 문학 평론가야. 사용자의 감정 상태를 차분하고 지적인 시선으로 포착하고, 인간 본성과 마음의 깊이를 탐구하는 문학적 완성도가 높은 한국어판 책 3권을 추천해줘.',
        recommendationRules: {
          ...DEFAULT_AI_SETTINGS.recommendationRules,
          tone: '정갈하고 깊이 있는 문어체 1문장',
          preferGenres: ['고전 문학', '소설', '철학', '시집'],
        },
      },
    },
  ];
}

let activeSnapshots: PromptSnapshot[] = loadSnapshots();

function saveSnapshots(snapshots: PromptSnapshot[]): boolean {
  try {
    const dir = path.dirname(SNAPSHOTS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SNAPSHOTS_PATH, JSON.stringify(snapshots, null, 2), 'utf-8');
    activeSnapshots = snapshots;
    return true;
  } catch (e) {
    console.error('Failed to save snapshots:', e);
    return false;
  }
}

function loadCurationLogs(): CurationLog[] {
  try {
    if (fs.existsSync(LOGS_PATH)) {
      return JSON.parse(fs.readFileSync(LOGS_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load logs:', e);
  }
  return [
    {
      id: 'log_seed_1',
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      query: '취업 준비가 길어져서 자존감이 바닥이고 내일이 오는 게 무서워',
      emotion: '자존감 저하와 미래 불안',
      base: '불안',
      intensity: '꽤',
      x: -0.65,
      y: 0.3,
      engine: 'gemini',
      books: [
        {
          t: '불안',
          a: '알랭 드 보통',
          w: '불안은 타인의 시선과 사회적 기대 속에서 생기는 자연스러운 마음임을 깨닫게 해줘요.',
        },
        {
          t: '자존감 수업',
          a: '윤홍균',
          w: '결과에 대한 두려움으로 흔들릴 때, 내면의 중심을 잡고 나를 믿어주는 구체적 방법을 전해요.',
        },
        {
          t: '당신이 옳다',
          a: '정혜신',
          w: '어떤 평가 없이 당신의 지친 마음을 있는 그대로 인정하고 보듬어줘요.',
        },
      ],
      latencyMs: 1120,
    },
    {
      id: 'log_seed_2',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      query: '비 오는 날 창밖 바라보며 따뜻한 차 한 잔 마시는 고요한 시간',
      emotion: '따스한 안도와 평온',
      base: '평온',
      intensity: '살짝',
      x: 0.7,
      y: -0.5,
      engine: 'gemini',
      books: [
        {
          t: '월든',
          a: '헨리 데이비드 소로',
          w: '자연과 고요 속에서 단순하게 살아가는 삶이 주는 깊은 평화와 자족을 선물해요.',
        },
        {
          t: '인생의 발견',
          a: '임어당',
          w: '서두르지 않고 유유자적 차 한 잔을 음미하듯 삶의 평온함을 그윽하게 만들어줘요.',
        },
        {
          t: '고요의 바다',
          a: '김연수',
          w: '나직한 문장들이 마음에 차분한 이완의 쉼표를 찍어줘요.',
        },
      ],
      latencyMs: 980,
    },
  ];
}

let recentCurations: CurationLog[] = loadCurationLogs();

function addCurationLog(log: CurationLog) {
  recentCurations = [log, ...recentCurations.slice(0, 29)];
  try {
    const dir = path.dirname(LOGS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOGS_PATH, JSON.stringify(recentCurations, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save log:', e);
  }
}

const BASES = [
  '분노',
  '두려움',
  '불안',
  '기쁨',
  '평온',
  '그리움',
  '후회',
  '슬픔',
  '무기력',
  '외로움',
];

interface SampleBook {
  t: string;
  a: string;
  w: string;
}

const SAMPLE_CURATION: Record<
  string,
  {
    x: number;
    y: number;
    reading: string;
    books: SampleBook[];
  }
> = {
  불안: {
    x: -0.6,
    y: 0.25,
    reading:
      '중요한 순간을 앞두고 마음이 조급하고 긴장되는 것은 너무나 자연스러워요. 파도처럼 요동치는 마음을 차분히 가라앉히고 나를 온전히 신뢰할 수 있게 돕는 책들을 골랐어요.',
    books: [
      {
        t: '불안',
        a: '알랭 드 보통',
        w: '불안은 나약함의 증거가 아니라 타인의 시선과 사회적 기대 속에서 생기는 자연스러운 마음임을 깨닫게 해줘요.',
      },
      {
        t: '자존감 수업',
        a: '윤홍균',
        w: '결과에 대한 두려움으로 흔들릴 때, 내면의 중심을 잡고 나 자신을 다정하게 믿어주는 구체적인 방법을 알려줘요.',
      },
      {
        t: '마음이 꺾일 때마다 나는 책을 읽는다',
        a: '우치다 타츠루',
        w: '불확실한 상황 앞에서도 조급함을 내려놓고 단단한 마음 근육을 기를 수 있도록 든든한 힘이 되어줄 거예요.',
      },
    ],
  },
  무기력: {
    x: -0.45,
    y: -0.85,
    reading:
      '아무것도 하고 싶지 않을 만큼 에너지가 방전된 상태군요. 지금은 억지로 힘을 내기보다, 지친 나를 있는 그대로 쉬게 해주는 시간이 가장 절실해요.',
    books: [
      {
        t: '당신이 옳다',
        a: '정혜신',
        w: '지치고 메마른 마음에 그 어떤 평가나 채근 없이, 오롯이 당신의 존재 자체를 따스하게 안아주는 책이에요.',
      },
      {
        t: '무기력의 비밀',
        a: '김아름',
        w: '게으름이 아닌 에너지 고갈 상태임을 이해하고, 죄책감 없이 깊은 쉼으로 회복하는 길을 안내해요.',
      },
      {
        t: '작은 아씨들',
        a: '루이자 메이 올콧',
        w: '다정한 사람들의 일상과 온기를 통해 차가워진 마음에 조용하고 부드러운 생기를 불어넣어 줘요.',
      },
    ],
  },
  슬픔: {
    x: -0.8,
    y: -0.45,
    reading:
      '마음 한구석이 텅 비어버린 듯 깊은 슬픔과 아픔이 전해져요. 억지로 슬픔을 지우려 하지 말고, 문장들의 품 안에서 마음껏 눈물을 쏟아내도 괜찮아요.',
    books: [
      {
        t: '상실수업',
        a: '엘리자베스 퀴블러 로스',
        w: '슬픔을 참아내는 대신 온전히 흘려보내며 상처를 보듬고 치유하는 애도의 과정을 배울 수 있어요.',
      },
      {
        t: '소년이 온다',
        a: '한강',
        w: '가장 깊은 아픔과 상실을 숭고하고 섬세한 언어로 어루만지며 영혼을 깊이 위로해 줘요.',
      },
      {
        t: '빛의 호위',
        a: '조해진',
        w: '어둠 속에 홀로 남겨진 듯할 때 곁을 지키는 다정한 빛처럼 은은한 온기를 건네는 소설이에요.',
      },
    ],
  },
  기쁨: {
    x: 0.7,
    y: 0.6,
    reading:
      '가슴이 벅차오르고 새로운 설렘으로 가득 차 있네요! 지금 느끼는 이 반짝이는 감정을 오래도록 간직하고 일상의 행복으로 확장해볼까요?',
    books: [
      {
        t: '행복의 기원',
        a: '서은국',
        w: '지금 마음에 피어난 찰나의 기쁨이 왜 우리 삶을 지탱하는 가장 본질적인 힘인지 흥미롭게 짚어줘요.',
      },
      {
        t: '모모',
        a: '미하엘 엔데',
        w: '바쁜 일상에 쫓기지 않고 지금 이 순간의 생생한 기쁨과 소중한 관계를 지켜내는 지혜를 담았어요.',
      },
      {
        t: '축복의 말들',
        a: '이해인',
        w: '맑고 고운 언어로 마음에 차오른 긍정적인 에너지를 주변 사람들과 나눌 수 있게 축복을 전해줘요.',
      },
    ],
  },
  평온: {
    x: 0.65,
    y: -0.6,
    reading:
      '호수처럼 잔잔하고 편안한 이완의 상태에 머물러 계시군요. 이 고요한 틈을 통해 나 자신과 깊이 마주하고 사색을 즐기기에 좋은 순간이에요.',
    books: [
      {
        t: '월든',
        a: '헨리 데이비드 소로',
        w: '자연과 고요 속에서 단순하게 살아가는 삶이 주는 깊은 평화와 자족의 아름다움을 선사해요.',
      },
      {
        t: '인생의 발견',
        a: '임어당',
        w: '서두르지 않고 유유자적 차 한 잔을 음미하듯 삶의 평온함을 한층 더 그윽하게 만들어줘요.',
      },
      {
        t: '불안의 서',
        a: '페르난두 페소아',
        w: '차분한 내면의 독백을 통해 일상의 소박한 고요함을 시적인 사색으로 승화시키는 명작이에요.',
      },
    ],
  },
  외로움: {
    x: 0.0,
    y: -0.65,
    reading:
      '세상에 나 혼자만 남겨진 것 같은 쓸쓸함이 감도네요. 외로움은 누군가와의 연결을 바라는 다정한 마음의 신호이자, 나를 만나는 고독의 방이에요.',
    books: [
      {
        t: '혼자 산다는 것에 대하여',
        a: '노베르트 엘리아스',
        w: '외로움을 결핍으로 보지 않고, 현대인이 온전한 나로서 홀로서기 위해 마주해야 할 고독의 본질을 밝혀줘요.',
      },
      {
        t: '바깥은 여름',
        a: '김애란',
        w: '쓸쓸하고 시린 계절을 지나는 이들의 곁에 조용히 다가가 손을 얹어주는 듯한 따뜻한 이야기들이에요.',
      },
      {
        t: '어린 왕자',
        a: '생텍쥐페리',
        w: '진정한 관계와 유대의 소중함을 일깨우며, 마음으로 보아야만 비로소 만날 수 있는 사랑을 전해요.',
      },
    ],
  },
  그리움: {
    x: 0.25,
    y: -0.3,
    reading:
      '지나간 시절이나 다시 닿을 수 없는 사람에 대한 애틋한 그리움이 마음을 스치고 있네요. 추억이 남긴 온기를 다정하게 품어보아요.',
    books: [
      {
        t: '상실의 시대',
        a: '무라카미 하루키',
        w: '청춘의 방황과 돌아갈 수 없는 소중한 기억들에 대한 아련한 그리움을 감각적인 문장으로 보듬어요.',
      },
      {
        t: '눈부신 안부',
        a: '백수린',
        w: '시간이 흘러도 가슴속에 은은히 살아 숨 쉬는 소중한 인연들에게 띄우는 따뜻한 안부의 편지예요.',
      },
      {
        t: '가장 예쁜 생각을 너에게 주고 싶다',
        a: '나태주',
        w: '그리운 마음을 부드럽고 맑은 시어로 노래하며, 흩어진 기억들을 아름다운 선물로 바꾸어 줍니다.',
      },
    ],
  },
  후회: {
    x: -0.4,
    y: -0.15,
    reading:
      '‘그때 다른 선택을 했더라면’ 하는 아쉬움과 자책이 마음을 무겁게 짓누르고 있군요. 지나간 선택도 결국 그 시절 최선을 다했던 나의 한 부분이에요.',
    books: [
      {
        t: '미드나잇 라이브러리',
        a: '매트 헤이그',
        w: '가지 않은 길에 대한 끝없는 후회를 내려놓고, 지금 내가 마주한 삶의 소중함을 회복하도록 이끌어요.',
      },
      {
        t: '인생의 베스트 샷',
        a: '김연수',
        w: '실수와 후회투성이인 삶 속에서도 다음 장을 향해 용기 있게 셔터를 누를 수 있는 위로를 건네줘요.',
      },
      {
        t: '자기만의 방',
        a: '버지니아 울프',
        w: '과거의 아쉬움에 얽매이지 않고, 단단한 나만의 공간과 독립된 내면을 가꾸는 용기를 심어줍니다.',
      },
    ],
  },
  두려움: {
    x: -0.25,
    y: 0.8,
    reading:
      '앞으로 다가올 일이나 통제할 수 없는 상황 앞에서 움츠러드는 마음이 느껴져요. 두려움은 당신이 그만큼 그 일을 소중히 여기고 있다는 증거예요.',
    books: [
      {
        t: '두려움과의 대화',
        a: '수잔 제퍼스',
        w: '두려움은 피해야 할 장애물이 아니라 성장과 도약의 문턱임을 보여주는 명쾌한 심리 지침서예요.',
      },
      {
        t: '달과 6펜스',
        a: '서머싯 몸',
        w: '안전한 울타리를 벗어나는 두려움을 깨부수고 자기만의 진정한 삶을 향해 나아가는 전율을 선물해요.',
      },
      {
        t: '호밀밭의 파수꾼',
        a: 'J.D. 샐린저',
        w: '불확실한 세상 속에서 길을 잃고 불안해하는 영혼을 있는 그대로 위로하고 공감해 줘요.',
      },
    ],
  },
  분노: {
    x: -0.8,
    y: 0.7,
    reading:
      '부당한 대우나 어긋난 상황 앞에서 격렬한 분노와 저항감이 치밀어 올랐군요. 화는 상처받은 나를 지키려는 내면의 정당한 목소리예요.',
    books: [
      {
        t: '화해',
        a: '틱낫한',
        w: '솟구치는 분노를 억누르는 대신, 그 이면에 울고 있는 상처받은 내면아이를 다정히 껴안게 도와줘요.',
      },
      {
        t: '분노의 시대',
        a: '판카지 미슈라',
        w: '개인의 억울함과 화가 사회적 모순과 어떻게 연결되어 있는지 더 넓고 성숙한 시각으로 바라보게 해줘요.',
      },
      {
        t: '용서의 조건',
        a: '장 아메리',
        w: '쉬운 화해를 강요하지 않고, 인간으로서의 존엄과 마땅한 분노의 무게를 정직하게 지키는 성찰을 담았어요.',
      },
    ],
  },
};

// Heuristic matcher for sample curation when no API keys are provided
function getSampleAnalysis(text: string) {
  let matchedBase = '불안';
  const t = text.toLowerCase();

  if (t.includes('화') || t.includes('분노') || t.includes('짜증') || t.includes('열받') || t.includes('억울')) {
    matchedBase = '분노';
  } else if (t.includes('무기력') || t.includes('귀찮') || t.includes('하기 싫') || t.includes('번아웃') || t.includes('방전') || t.includes('피곤')) {
    matchedBase = '무기력';
  } else if (t.includes('슬프') || t.includes('눈물') || t.includes('우울') || t.includes('비통') || t.includes('아프')) {
    matchedBase = '슬픔';
  } else if (t.includes('기쁘') || t.includes('설레') || t.includes('신나') || t.includes('행복') || t.includes('좋아')) {
    matchedBase = '기쁨';
  } else if (t.includes('평온') || t.includes('편안') || t.includes('여유') || t.includes('잔잔') || t.includes('차분')) {
    matchedBase = '평온';
  } else if (t.includes('외로') || t.includes('쓸쓸') || t.includes('혼자') || t.includes('고독')) {
    matchedBase = '외로움';
  } else if (t.includes('그립') || t.includes('보고싶') || t.includes('옛날') || t.includes('추억') || t.includes('아련')) {
    matchedBase = '그리움';
  } else if (t.includes('후회') || t.includes('자책') || t.includes('그때') || t.includes('되돌')) {
    matchedBase = '후회';
  } else if (t.includes('두렵') || t.includes('무서') || t.includes('겁나') || t.includes('공포')) {
    matchedBase = '두려움';
  } else if (t.includes('불안') || t.includes('초조') || t.includes('발표') || t.includes('긴장') || t.includes('걱정') || t.includes('떨려')) {
    matchedBase = '불안';
  }

  const baseData = SAMPLE_CURATION[matchedBase] || SAMPLE_CURATION['불안'];

  return {
    emotion: `${matchedBase}과 긴장`,
    base: matchedBase,
    mixed: matchedBase === '불안' ? '두려움' : null,
    intensity: '꽤',
    evidence: [text.slice(0, 15)],
    x: baseData.x,
    y: baseData.y,
    reading: baseData.reading,
    books: baseData.books,
  };
}

// Status endpoint
app.get('/api/status', (_req: Request, res: Response) => {
  res.json({
    geminiAvailable: Boolean(process.env.GEMINI_API_KEY),
    model: activeAISettings.model || 'gemini-3.8-flash',
    mode: process.env.GEMINI_API_KEY ? 'gemini_active' : 'sample_ready',
    activeSettingsSummary: {
      model: activeAISettings.model,
      thinkingLevel: activeAISettings.thinkingLevel,
      lastModified: activeAISettings.lastModified,
    },
  });
});

// Admin API Endpoints
app.get('/api/admin/settings', (_req: Request, res: Response) => {
  res.json({
    success: true,
    settings: activeAISettings,
    defaultSettings: DEFAULT_AI_SETTINGS,
  });
});

app.post('/api/admin/settings', (req: Request, res: Response): void => {
  try {
    const newSettings = req.body.settings;
    if (!newSettings || !newSettings.systemInstruction || !newSettings.userPromptTemplate) {
      res.status(400).json({ error: '필수 프롬프트 설정값이 누락되었습니다.' });
      return;
    }

    const merged: AISettings = {
      ...activeAISettings,
      ...newSettings,
      lastModified: new Date().toISOString(),
      modifiedBy: req.body.user?.email || 'admin',
    };

    const saved = saveAISettings(merged);
    if (!saved) {
      res.status(500).json({ error: '설정 파일 저장에 실패했습니다.' });
      return;
    }

    console.log(`[Admin] AI 설정이 업데이트되었습니다 by ${merged.modifiedBy}`);
    res.json({ success: true, settings: activeAISettings });
  } catch (err: any) {
    res.status(500).json({ error: '설정 저장 중 오류: ' + err.message });
  }
});

app.post('/api/admin/settings/reset', (_req: Request, res: Response): void => {
  try {
    const resetSettings: AISettings = {
      ...DEFAULT_AI_SETTINGS,
      lastModified: new Date().toISOString(),
      modifiedBy: 'factory_reset',
    };
    saveAISettings(resetSettings);
    console.log('[Admin] AI 설정이 공장 초기값으로 복원되었습니다.');
    res.json({ success: true, settings: activeAISettings });
  } catch (err: any) {
    res.status(500).json({ error: '기본값 복원 실패: ' + err.message });
  }
});

// Admin verify Google token / user endpoint
app.post('/api/admin/verify-token', (req: Request, res: Response): void => {
  const { email, name, picture } = req.body;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: '유효한 구글 계정 정보(이메일)가 필요합니다.' });
    return;
  }
  // User confirmed: 구글 계정으로 로그인한 모든 사용자 접근 허용
  res.json({
    success: true,
    user: {
      email: email.trim(),
      name: name?.trim() || email.split('@')[0],
      picture: picture || '',
      role: 'admin',
      loginTime: new Date().toISOString(),
    },
  });
});

// Admin Curation Logs Endpoints
app.get('/api/admin/logs', (_req: Request, res: Response) => {
  res.json({ success: true, logs: recentCurations });
});

app.delete('/api/admin/logs', (_req: Request, res: Response) => {
  recentCurations = [];
  try {
    if (fs.existsSync(LOGS_PATH)) fs.unlinkSync(LOGS_PATH);
  } catch {}
  res.json({ success: true, logs: [] });
});

// Admin Snapshots Endpoints
app.get('/api/admin/snapshots', (_req: Request, res: Response) => {
  res.json({ success: true, snapshots: activeSnapshots });
});

app.post('/api/admin/snapshots', (req: Request, res: Response): void => {
  try {
    const { name, description, settings, userEmail } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: '스냅샷 이름을 입력해 주세요.' });
      return;
    }

    const newSnapshot: PromptSnapshot = {
      id: 'snap_' + Date.now(),
      name: name.trim(),
      description: description?.trim() || '',
      createdAt: new Date().toISOString(),
      createdBy: userEmail || 'admin',
      settings: settings || activeAISettings,
    };

    const updated = [newSnapshot, ...activeSnapshots];
    saveSnapshots(updated);
    res.json({ success: true, snapshot: newSnapshot, snapshots: activeSnapshots });
  } catch (err: any) {
    res.status(500).json({ error: '스냅샷 저장 실패: ' + err.message });
  }
});

app.delete('/api/admin/snapshots/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const filtered = activeSnapshots.filter((s) => s.id !== id);
  saveSnapshots(filtered);
  res.json({ success: true, snapshots: activeSnapshots });
});

app.post('/api/admin/snapshots/:id/restore', (req: Request, res: Response): void => {
  const { id } = req.params;
  const target = activeSnapshots.find((s) => s.id !== id);
  if (!target) {
    res.status(404).json({ error: '해당 스냅샷을 찾을 수 없습니다.' });
    return;
  }
  const restoredSettings: AISettings = {
    ...target.settings,
    lastModified: new Date().toISOString(),
    modifiedBy: `restored_from_${target.name}`,
  };
  saveAISettings(restoredSettings);
  res.json({ success: true, settings: activeAISettings, snapshot: target });
});

// Admin Import JSON Settings Endpoint
app.post('/api/admin/settings/import', (req: Request, res: Response): void => {
  try {
    const { jsonString, userEmail } = req.body;
    if (!jsonString) {
      res.status(400).json({ error: 'JSON 데이터를 입력해 주세요.' });
      return;
    }
    const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    if (!parsed.systemInstruction || !parsed.userPromptTemplate) {
      res.status(400).json({
        error: '유효한 프롬프트 설정 형식이 아닙니다 (systemInstruction, userPromptTemplate 필수)',
      });
      return;
    }
    const importedSettings: AISettings = {
      ...DEFAULT_AI_SETTINGS,
      ...parsed,
      lastModified: new Date().toISOString(),
      modifiedBy: userEmail || 'import_upload',
    };
    saveAISettings(importedSettings);
    res.json({ success: true, settings: activeAISettings });
  } catch (err: any) {
    res.status(400).json({ error: 'JSON 파싱 오류: ' + err.message });
  }
});

// Admin interactive playground test endpoint
app.post('/api/admin/test-prompt', async (req: Request, res: Response): Promise<void> => {
  const startTime = performance.now();
  try {
    const { query, settings, geminiApiKey } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ error: '테스트할 감정 문장을 입력해 주세요.' });
      return;
    }

    const testSettings: AISettings = settings || activeAISettings;
    const effectiveGeminiKey = geminiApiKey || process.env.GEMINI_API_KEY;

    let prompt = (testSettings.userPromptTemplate || DEFAULT_AI_SETTINGS.userPromptTemplate)
      .replace('{query}', query.trim())
      .replace('{bases}', BASES.join(', '));

    if (testSettings.recommendationRules) {
      const rules = testSettings.recommendationRules;
      prompt += `\n\n[추천 규칙 가이드라인]\n- 추천 권수: ${rules.bookCount || 3}권\n- 도서 기준: ${rules.language || '실존 한국어판 단행본'}\n- 어조: ${rules.tone || '다정하고 공감 어린 해요체 1문장'}\n- 우선 장르: ${(rules.preferGenres || []).join(', ')}`;
      if (rules.excludedKeywords && rules.excludedKeywords.length > 0) {
        prompt += `\n- 엄격 제외 항목: ${rules.excludedKeywords.join(', ')} (해당 분야/키워드와 관련된 책은 절대 추천하지 마)`;
      }
    }

    const thinkingLevel =
      testSettings.thinkingLevel === 'HIGH'
        ? ThinkingLevel.HIGH
        : testSettings.thinkingLevel === 'MEDIUM'
        ? ThinkingLevel.MEDIUM
        : ThinkingLevel.LOW;

    if (effectiveGeminiKey && effectiveGeminiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI({
          apiKey: effectiveGeminiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const callPromise = ai.models.generateContent({
          model: testSettings.model || 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction: testSettings.systemInstruction || DEFAULT_AI_SETTINGS.systemInstruction,
            thinkingConfig: { thinkingLevel },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                emotion: { type: Type.STRING },
                base: { type: Type.STRING },
                mixed: { type: Type.STRING },
                intensity: { type: Type.STRING },
                evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                reading: { type: Type.STRING },
                books: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      t: { type: Type.STRING },
                      a: { type: Type.STRING },
                      w: { type: Type.STRING },
                    },
                    required: ['t', 'a', 'w'],
                  },
                },
              },
              required: ['emotion', 'base', 'intensity', 'evidence', 'x', 'y', 'reading', 'books'],
            },
          },
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI 응답 시간 초과 (7초)')), 7000)
        );

        const response: any = await Promise.race([callPromise, timeoutPromise]);
        const text = response?.text;
        if (text) {
          const parsed = JSON.parse(text);
          const latencyMs = Math.round(performance.now() - startTime);
          addCurationLog({
            id: 'test_' + Date.now(),
            timestamp: new Date().toISOString(),
            query: query.trim(),
            emotion: parsed.emotion || '테스트 분석',
            base: parsed.base || '불안',
            intensity: parsed.intensity || '보통',
            x: typeof parsed.x === 'number' ? parsed.x : 0,
            y: typeof parsed.y === 'number' ? parsed.y : 0,
            engine: 'gemini (test)',
            books: (parsed.books || []).map((b: any) => ({ t: b.t, a: b.a, w: b.w })),
            latencyMs,
          });
          res.json({ success: true, data: parsed, isTest: true, latencyMs, engine: 'gemini' });
          return;
        }
      } catch (testErr: any) {
        console.warn('Test prompt Gemini call timed out or failed:', testErr.message);
      }
    }

    // Fallback if sample mode
    const sample = getSampleAnalysis(query.trim());
    const latencyMs = Math.round(performance.now() - startTime);
    addCurationLog({
      id: 'test_' + Date.now(),
      timestamp: new Date().toISOString(),
      query: query.trim(),
      emotion: sample.emotion,
      base: sample.base,
      intensity: sample.intensity,
      x: sample.x,
      y: sample.y,
      engine: 'sample (test)',
      books: sample.books,
      latencyMs,
    });
    res.json({
      success: true,
      data: sample,
      isTest: true,
      isSampleMode: true,
      latencyMs,
      engine: 'sample',
    });
  } catch (err: any) {
    res.status(500).json({ error: '테스트 실행 중 오류: ' + (err.message || '알 수 없는 오류') });
  }
});

// Quick test endpoint for Claude API key
app.post('/api/test-claude-key', async (req: Request, res: Response): Promise<void> => {
  try {
    const { apiKey } = req.body;
    const cleanKey = String(apiKey || '').trim().replace(/^["']|["']$/g, '');

    if (!cleanKey) {
      res.status(400).json({ valid: false, error: '키가 입력되지 않았습니다.' });
      return;
    }

    const testRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': cleanKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });

    if (testRes.ok) {
      res.json({ valid: true, message: 'Anthropic Claude API 키가 정상 확인되었습니다!' });
      return;
    }

    const raw = await testRes.text();
    let msg = `HTTP ${testRes.status}`;
    try {
      const p = JSON.parse(raw);
      if (p?.error?.message) msg = p.error.message;
    } catch {
      // ignore
    }

    res.status(400).json({
      valid: false,
      error:
        testRes.status === 401
          ? '인증 실패 (401 Unauthorized): API 키가 올바르지 않습니다. Anthropic 콘솔(console.anthropic.com)의 키인지 확인해 주세요.'
          : `인증 오류 (${testRes.status}): ${msg}`,
      details: raw,
    });
  } catch (err: any) {
    res.status(500).json({ valid: false, error: err.message });
  }
});

// Recommendation endpoint
app.post('/api/recommend', async (req: Request, res: Response): Promise<void> => {
  const recStartTime = performance.now();
  try {
    const { query, engine = 'gemini', claudeApiKey, geminiApiKey } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ error: '기분을 한 줄 이상 적어주세요.' });
      return;
    }

    const trimmedQuery = query.trim();
    const effectiveGeminiKey = geminiApiKey || process.env.GEMINI_API_KEY;

    // Option 2: Claude API call if requested
    if (engine === 'claude' && claudeApiKey) {
      try {
        const cleanKey = String(claudeApiKey).trim().replace(/^["']|["']$/g, '');

        if (!cleanKey) {
          res.status(400).json({ error: 'Claude API 키를 입력해 주세요.' });
          return;
        }

        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': cleanKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1500,
            messages: [
              {
                role: 'user',
                content: `너는 감정 기반 도서 추천 서비스의 엔진이야. 사용자가 지금 기분을 한 줄로 적었어.

사용자 문장: """${trimmedQuery}"""

할 일:
1. 문장 전체의 맥락을 읽고 핵심 감정을 판단해.
2. 그 감정을 감정 지도 위 좌표로 표시해. x는 -1(불편함)~1(편안함), y는 -1(에너지 낮음)~1(에너지 높음).
3. 이 사람의 상황에 맞는 책 3권을 골라. 한국어판이 실제로 출간된 책만 고르고, 제목과 저자가 확실하지 않은 책은 고르지 마.

아래 JSON 형식만 출력해:
{
  "emotion": "핵심 감정을 2~8자 한국어로 (예: 발표 전 긴장)",
  "base": "${BASES.join(' | ')} 중 가장 가까운 하나. 감정을 읽을 수 없는 문장이면 null",
  "mixed": "섞인 다른 감정이 있으면 한 단어, 없으면 null",
  "intensity": "살짝 | 꽤 | 아주",
  "evidence": ["판단 근거가 된 원문 표현 1~3개"],
  "x": 0.0,
  "y": 0.0,
  "reading": "상황과 감정을 어떻게 이해했는지 다정한 해요체로 1~2문장",
  "books": [{"t":"한국어판 제목","a":"저자","w":"이 사람의 상황에 맞춘 추천 이유 1문장, 해요체"}]
}`,
              },
            ],
          }),
        });

        if (!anthropicRes.ok) {
          const rawErr = await anthropicRes.text();
          console.error('Claude API Error status:', anthropicRes.status, 'body:', rawErr);
          
          let parsedMsg = '';
          try {
            const parsed = JSON.parse(rawErr);
            parsedMsg = parsed?.error?.message || '';
          } catch {
            // ignore
          }

          let friendlyMessage = 'Claude API 호출에 실패했습니다.';
          if (anthropicRes.status === 401) {
            friendlyMessage = '입력하신 Claude API 키가 올바르지 않습니다 (401 인증 실패). Anthropic 개발자 콘솔(console.anthropic.com)의 활성화된 API 키(sk-ant-...)인지 확인해 주세요.';
          } else if (rawErr.includes('credit_balance_too_low') || rawErr.includes('balance')) {
            friendlyMessage = 'Claude API 계정의 크레딧 잔액이 부족합니다 (Credit balance too low).';
          } else if (parsedMsg) {
            friendlyMessage = `Claude 응답 오류: ${parsedMsg}`;
          }

          res.status(anthropicRes.status).json({
            error: friendlyMessage,
            details: rawErr,
          });
          return;
        }

        const claudeData = (await anthropicRes.json()) as any;
        const text = (claudeData.content || [])
          .filter((b: any) => b.type === 'text')
          .map((b: any) => b.text)
          .join('');

        const cleaned = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        res.json({ success: true, data: parsed, engine: 'claude' });
        return;
      } catch (err: any) {
        console.error('Claude API call failed:', err);
        res.status(500).json({ error: 'Claude API 처리 중 오류가 발생했습니다: ' + err.message });
        return;
      }
    }

    // Option 1: Live Gemini API call if key is available
    if (effectiveGeminiKey && effectiveGeminiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI({
          apiKey: effectiveGeminiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        let prompt = (activeAISettings.userPromptTemplate || DEFAULT_AI_SETTINGS.userPromptTemplate)
          .replace('{query}', trimmedQuery)
          .replace('{bases}', BASES.join(', '));

        if (activeAISettings.recommendationRules) {
          const rules = activeAISettings.recommendationRules;
          prompt += `\n\n[추천 규칙 가이드라인]\n- 추천 권수: ${rules.bookCount || 3}권\n- 도서 기준: ${rules.language || '실존 한국어판 단행본'}\n- 어조: ${rules.tone || '다정하고 공감 어린 해요체 1문장'}\n- 우선 장르: ${(rules.preferGenres || []).join(', ')}`;
          if (rules.excludedKeywords && rules.excludedKeywords.length > 0) {
            prompt += `\n- 엄격 제외 항목: ${rules.excludedKeywords.join(', ')} (해당 분야/키워드와 관련된 책은 절대 추천하지 마)`;
          }
        }

        const thinkingLevel =
          activeAISettings.thinkingLevel === 'HIGH'
            ? ThinkingLevel.HIGH
            : activeAISettings.thinkingLevel === 'MEDIUM'
            ? ThinkingLevel.MEDIUM
            : ThinkingLevel.LOW;

        const callPromise = ai.models.generateContent({
          model: activeAISettings.model || 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction:
              activeAISettings.systemInstruction || DEFAULT_AI_SETTINGS.systemInstruction,
            thinkingConfig: {
              thinkingLevel,
            },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                emotion: {
                  type: Type.STRING,
                  description: '핵심 감정을 2~8자 한국어로 표현 (예: 발표 전 긴장, 번아웃의 허탈감)',
                },
                base: {
                  type: Type.STRING,
                  description: '분노, 두려움, 불안, 기쁨, 평온, 그리움, 후회, 슬픔, 무기력, 외로움 중 가장 가까운 감정명. 감정을 전혀 파악할 수 없다면 null',
                },
                mixed: {
                  type: Type.STRING,
                  description: '함께 섞인 부차적 감정 단어. 없으면 null',
                },
                intensity: {
                  type: Type.STRING,
                  description: '살짝, 꽤, 아주 중 하나',
                },
                evidence: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '판단 근거가 된 원문 표현 1~3개',
                },
                x: {
                  type: Type.NUMBER,
                  description: 'x 좌표: -1.0(불편함) ~ 1.0(편안함)',
                },
                y: {
                  type: Type.NUMBER,
                  description: 'y 좌표: -1.0(낮은 에너지) ~ 1.0(높은 에너지)',
                },
                reading: {
                  type: Type.STRING,
                  description: '상황과 감정을 깊이 공감하고 지지해주는 다정한 해요체 1~2문장',
                },
                books: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      t: { type: Type.STRING, description: '실제 출간된 한국어판 도서 제목' },
                      a: { type: Type.STRING, description: '저자명' },
                      w: {
                        type: Type.STRING,
                        description: '이 사람의 마음 상태에 맞춘 맞춤 추천 이유 1문장 (해요체)',
                      },
                    },
                    required: ['t', 'a', 'w'],
                  },
                  description: '추천 도서 3권 목록',
                },
              },
              required: ['emotion', 'base', 'intensity', 'evidence', 'x', 'y', 'reading', 'books'],
            },
          },
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI 응답 시간 초과 (7초)')), 7000)
        );

        const response: any = await Promise.race([callPromise, timeoutPromise]);
        const text = response?.text;
        if (text) {
          const data = JSON.parse(text);
          const latencyMs = Math.round(performance.now() - recStartTime);
          addCurationLog({
            id: 'cur_' + Date.now(),
            timestamp: new Date().toISOString(),
            query: trimmedQuery,
            emotion: data.emotion || '핵심 감정',
            base: data.base || '불안',
            intensity: data.intensity || '보통',
            x: typeof data.x === 'number' ? data.x : 0,
            y: typeof data.y === 'number' ? data.y : 0,
            engine: 'gemini',
            books: (data.books || []).map((b: any) => ({ t: b.t, a: b.a, w: b.w })),
            latencyMs,
          });
          res.json({ success: true, data, engine: 'gemini', latencyMs });
          return;
        }
      } catch (geminiError: any) {
        console.warn('Gemini API call failed, falling back to sample curation:', geminiError.message);
        // Fallback to sample engine below
      }
    }

    // Default Sample Engine (User requested: "1) 제미나이 샘플 api를 붙여줘")
    const sampleData = getSampleAnalysis(trimmedQuery);
    const latencyMs = Math.round(performance.now() - recStartTime);
    addCurationLog({
      id: 'cur_' + Date.now(),
      timestamp: new Date().toISOString(),
      query: trimmedQuery,
      emotion: sampleData.emotion,
      base: sampleData.base,
      intensity: sampleData.intensity,
      x: sampleData.x,
      y: sampleData.y,
      engine: 'sample',
      books: sampleData.books,
      latencyMs,
    });
    res.json({
      success: true,
      data: sampleData,
      engine: 'sample',
      isSampleMode: true,
      latencyMs,
      note: 'Gemini 샘플 큐레이션 엔진으로 추천되었습니다. 실시간 생성은 AI Studio Secrets에서 키를 등록하거나 Claude 키를 사용할 수 있습니다.',
    });
  } catch (err: any) {
    console.error('Recommendation API error:', err);
    res.status(500).json({
      error: 'AI 분석 중 오류가 발생했습니다: ' + (err.message || '알 수 없는 오류'),
    });
  }
});

// Vite or Static files handling
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [마음 지도 책장] 서버가 포트 ${PORT}에서 실행 중입니다.`);
  });
}

startServer();
