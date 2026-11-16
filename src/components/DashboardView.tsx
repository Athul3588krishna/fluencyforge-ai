import { ArrowRight, BookOpen, CheckCircle2, Flame, MessageSquare, Mic, RefreshCw } from 'lucide-react';
import { LEARNING_LEVELS, LEVEL_NAMES } from '../data/curriculum';
import type {
  AnalyticsSummary,
  MistakeItem,
  TaskProgressRecord,
  UserProfile,
  VocabularyEntry,
} from '../types/fluency';

interface DashboardViewProps {
  user: UserProfile;
  analytics: AnalyticsSummary;
  taskProgress: TaskProgressRecord[];
  recentMistakes: MistakeItem[];
  vocabulary: VocabularyEntry[];
  onStartTask: (taskId: string) => void;
  onStartFreePractice: () => void;
  onNavigate: (tab: 'journey' | 'mistakes' | 'activities' | 'analytics') => void;
  onPracticeMistake: (mistake: MistakeItem) => void;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 && mins < 10 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function DashboardView({
  user,
  analytics,
  taskProgress,
  recentMistakes,
  vocabulary,
  onStartTask,
  onStartFreePractice,
  onNavigate,
  onPracticeMistake,
}: DashboardViewProps) {
  const allTasks = LEARNING_LEVELS.flatMap((l) => l.tasks);
  const progressMap = new Map(taskProgress.map((p) => [p.taskId, p]));

  const nextUnlockedTask =
    allTasks.find((t) => progressMap.get(t.id)?.status === 'unlocked') || allTasks[0];
  const nextTaskRecord = progressMap.get(nextUnlockedTask.id);
  const currentLevelDef =
    LEARNING_LEVELS.find((l) => l.levelNumber === user.currentLevel) || LEARNING_LEVELS[0];
  const currentLevelDone = currentLevelDef.tasks.filter(
    (t) => progressMap.get(t.id)?.status === 'completed'
  ).length;

  const todayGoalSeconds = analytics.dailyGoalMinutes * 60;
  const todayGoalPct = Math.min(
    100,
    Math.round((analytics.todaySpeakingSeconds / Math.max(1, todayGoalSeconds)) * 100)
  );

  return (
    <div className="space-y-8">
      {/* Primary Focal Header + Daily Task */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 lg:p-7 flex flex-col justify-between gap-6">
          <div className="space-y-3">
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Level {user.currentLevel} of 6 · {LEVEL_NAMES[user.currentLevel]} ·{' '}
              {currentLevelDone}/{currentLevelDef.tasks.length} Tasks Done
            </div>
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
              Next Lesson: {nextUnlockedTask.title}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              {nextUnlockedTask.description}
            </p>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Grammar focus: <span className="font-semibold text-slate-800 dark:text-slate-200">{nextUnlockedTask.grammarFocus}</span>
              {' · '}
              Progress:{' '}
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {nextTaskRecord?.turnsCompleted || 0}/{nextUnlockedTask.requiredTurns} turns
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onStartTask(nextUnlockedTask.id)}
              className="px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Mic className="w-4 h-4" />
              <span>Practice This Lesson</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onStartFreePractice}
              className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-medium inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Open Free Conversation</span>
            </button>
          </div>
        </div>

        {/* Daily Goal & Streak Panel */}
        <div className="lg:col-span-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 flex flex-col justify-between gap-5">
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Daily Speaking Goal
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                {formatDuration(analytics.todaySpeakingSeconds)}
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Target {analytics.dailyGoalMinutes}m
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                style={{ width: `${todayGoalPct}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
              {todayGoalPct >= 100
                ? 'Daily goal completed!'
                : `${todayGoalPct}% of today’s speaking target reached`}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Flame className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <div>
                <div className="font-mono text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  {analytics.streakDays} {analytics.streakDays === 1 ? 'Day' : 'Days'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Active Streak</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('journey')}
              className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
            >
              View All Levels
            </button>
          </div>
        </div>
      </section>

      {/* 4-Column Tabular Metrics Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Grammar Accuracy
          </div>
          <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {user.totalTurns > 0 ? `${analytics.grammarAccuracy}%` : '—'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {user.totalTurns > 0
              ? `${user.correctTurns} clean / ${user.totalTurns} turns`
              : 'Complete 1st turn to measure'}
          </div>
        </div>

        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Speaking Time
          </div>
          <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {formatDuration(analytics.totalSpeakingSeconds)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Across voice &amp; text sessions
          </div>
        </div>

        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Tasks Completed
          </div>
          <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {analytics.tasksCompleted}/{analytics.totalTasks}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            6 progressive fluency levels
          </div>
        </div>

        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Vocabulary Learned
          </div>
          <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {analytics.vocabularyCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Words saved with Malayalam meanings
          </div>
        </div>
      </section>

      {/* Recent Mistakes & Vocabulary */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Recent Mistakes &amp; Memory
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Genuine grammar errors saved automatically for revision
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('mistakes')}
              className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
            >
              Open Mistake Memory
            </button>
          </div>

          {recentMistakes.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                No mistakes logged yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Start speaking or chatting with your AI teacher. Any genuine grammar or vocabulary
                errors will appear here with Malayalam explanations.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentMistakes.map((m) => (
                <div key={m.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {m.category} · Repeated {m.occurrences}x
                    </span>
                    <button
                      type="button"
                      onClick={() => onPracticeMistake(m)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Practice Fix
                    </button>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 line-through decoration-red-500/70">
                    {m.originalSentence}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {m.correctedSentence}
                  </div>
                  <p className="malayalam-text text-xs text-slate-600 dark:text-slate-300">
                    {m.explanationMalayalam}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vocabulary & Quick Activities */}
        <div className="lg:col-span-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Vocabulary Bank
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Useful words picked up from your conversations
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
            >
              Analytics
            </button>
          </div>

          {vocabulary.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <BookOpen className="w-7 h-7 text-slate-400 mx-auto" />
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Your vocabulary list is ready
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                As you talk with FluencyForge AI, helpful words and their Malayalam meanings will
                be saved here automatically.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {vocabulary.slice(0, 6).map((v) => (
                <div key={v.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
                      {v.word}
                    </span>
                    <span className="malayalam-text text-xs font-medium text-blue-700 dark:text-blue-400">
                      {v.meaningMalayalam}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {v.exampleSentence}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
