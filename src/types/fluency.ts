export type LevelNumber = 1 | 2 | 3 | 4 | 5 | 6;

export type GrammarCategory =
  | 'Tenses'
  | 'Articles'
  | 'Prepositions'
  | 'Subject-Verb Agreement'
  | 'Sentence Structure'
  | 'Vocabulary'
  | 'Word Order';

export type MistakeSeverity = 'genuine_error' | 'optional_improvement';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  currentLevel: LevelNumber;
  levelName: string;
  assessmentCompleted: boolean;
  assessmentSummary?: string;
  dailyGoalMinutes: number;
  streakDays: number;
  lastActiveDate: string | null;
  totalSpeakingSeconds: number;
  totalTurns: number;
  correctTurns: number;
  createdAt: string;
}

export interface CurriculumTask {
  id: string;
  levelNumber: LevelNumber;
  order: number;
  title: string;
  description: string;
  grammarFocus: GrammarCategory;
  requiredTurns: number;
  starterPrompt: string;
  successCriteria: string;
}

export interface LearningLevel {
  levelNumber: LevelNumber;
  name: string;
  subtitle: string;
  description: string;
  tasks: CurriculumTask[];
}

export type ActivitySlug =
  | 'self-introduction'
  | 'daily-routine'
  | 'picture-description'
  | 'storytelling'
  | 'vocabulary-challenges'
  | 'listen-and-answer'
  | 'real-life-conversations'
  | 'interview-simulation'
  | 'group-discussion'
  | 'professional-communication';

export interface PictureScene {
  id: 'market' | 'office' | 'station';
  title: string;
  caption: string;
  aiContext: string;
}

export interface PracticeActivity {
  slug: ActivitySlug;
  title: string;
  subtitle: string;
  description: string;
  recommendedLevel: LevelNumber;
  mode: 'conversation' | 'picture' | 'listening' | 'vocabulary' | 'interview';
  starterPrompt: string;
  focusSkills: GrammarCategory[];
}

export interface MistakeItem {
  id: string;
  userId: string;
  category: GrammarCategory;
  severity: MistakeSeverity;
  originalSentence: string;
  correctedSentence: string;
  wrongSnippet: string;
  correctedSnippet: string;
  explanationMalayalam: string;
  ruleSummary: string;
  occurrences: number;
  resolvedCount: number;
  lastSeenAt: string;
  createdAt: string;
}

export interface DetectedMistake {
  category: GrammarCategory;
  wrongSnippet: string;
  correctedSnippet: string;
  severity: MistakeSeverity;
  explanationMalayalam: string;
  ruleSummary: string;
}

export interface CorrectionDetail {
  originalSentence: string;
  correctedSentence: string;
  malayalamExplanation: string;
  naturalAlternatives: string[];
  additionalExamples: string[];
  repeatPrompt: string;
  mistakes: DetectedMistake[];
}

export interface VocabularyEntry {
  id: string;
  word: string;
  meaningMalayalam: string;
  exampleSentence: string;
  mastered: boolean;
  learnedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  inputMode?: 'voice' | 'text';
  speakingSeconds?: number;
  isGrammaticallyCorrect?: boolean;
  hasGenuineErrors?: boolean;
  correction?: CorrectionDetail | null;
  followUpQuestion?: string;
  repeatRequired?: boolean;
  repeatCompleted?: boolean;
}

export interface TaskProgressRecord {
  taskId: string;
  levelNumber: LevelNumber;
  status: 'locked' | 'unlocked' | 'completed';
  turnsCompleted: number;
  attempts: number;
  bestAccuracy: number;
  lastPracticedAt: string | null;
  completedAt: string | null;
}

export interface DailyActivityPoint {
  date: string;
  label: string;
  speakingMinutes: number;
  turns: number;
  correctTurns: number;
  accuracy: number;
}

export interface AnalyticsSummary {
  streakDays: number;
  totalSpeakingSeconds: number;
  todaySpeakingSeconds: number;
  dailyGoalMinutes: number;
  grammarAccuracy: number;
  tasksCompleted: number;
  totalTasks: number;
  vocabularyCount: number;
  totalMistakesLogged: number;
  weakestCategories: Array<{
    category: GrammarCategory;
    count: number;
    resolvedCount: number;
  }>;
  weeklySeries: DailyActivityPoint[];
  recentSessions: Array<{
    id: string;
    title: string;
    mode: string;
    turns: number;
    accuracy: number;
    speakingSeconds: number;
    updatedAt: string;
  }>;
}

export interface RevisionDrillItem {
  id: string;
  category: GrammarCategory;
  brokenSentence: string;
  promptQuestion: string;
  hintMalayalam: string;
  targetAnswer: string;
}

export interface RevisionDrill {
  focusSummary: string;
  focusMalayalam: string;
  items: RevisionDrillItem[];
}
