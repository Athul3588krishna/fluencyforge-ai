import { Check, Volume2 } from 'lucide-react';
import { LEARNING_LEVELS } from '../data/curriculum';
import { apiRequest } from '../lib/api';
import { speakEnglishText } from '../lib/speech';
import type { AnalyticsSummary, TaskProgressRecord, VocabularyEntry } from '../types/fluency';

interface AnalyticsViewProps {
  analytics: AnalyticsSummary;
  taskProgress: TaskProgressRecord[];
  vocabulary: VocabularyEntry[];
  onVocabularyUpdated: (item: VocabularyEntry) => void;
}

export function AnalyticsView({
  analytics,
  taskProgress,
  vocabulary,
  onVocabularyUpdated,
}: AnalyticsViewProps) {
  const maxMinutes = Math.max(5, ...analytics.weeklySeries.map((d) => d.speakingMinutes));

  const toggleMastered = async (id: string) => {
    try {
      const res = await apiRequest<{ item: VocabularyEntry }>(`/api/learning/vocabulary/${id}/toggle`, {
        method: 'POST',
      });
      onVocabularyUpdated(res.item);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-8">
      <div className="max-w-2xl space-y-1.5">
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Progress Analytics &amp; Vocabulary
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Track your 7-day speaking consistency, grammar accuracy trends, level completion, and
          vocabulary mastery.
        </p>
      </div>

      {/* 7-Day Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Speaking Time Chart */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-5">
          <div className="flex items-baseline justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Weekly Speaking Time
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Minutes practiced per day</p>
            </div>
            <span className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-400 tabular-nums">
              {Math.round((analytics.totalSpeakingSeconds / 60) * 10) / 10}m total
            </span>
          </div>

          <div className="grid grid-cols-7 gap-3 items-end h-44 pt-4">
            {analytics.weeklySeries.map((point) => {
              const heightPct = Math.max(6, Math.round((point.speakingMinutes / maxMinutes) * 100));
              return (
                <div key={point.date} className="flex flex-col items-center gap-2 h-full justify-end">
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    {point.speakingMinutes}m
                  </span>
                  <div className="w-full max-w-[36px] flex-1 flex items-end bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden">
                    <div
                      className="w-full bg-blue-600 dark:bg-blue-500 rounded-t-sm transition-all"
                      style={{ height: `${point.speakingMinutes > 0 ? heightPct : 4}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {point.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grammar Accuracy Chart */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-5">
          <div className="flex items-baseline justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Weekly Grammar Accuracy
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Percentage of turns without genuine errors
              </p>
            </div>
            <span className="font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {analytics.grammarAccuracy}% overall
            </span>
          </div>

          <div className="grid grid-cols-7 gap-3 items-end h-44 pt-4">
            {analytics.weeklySeries.map((point) => (
              <div key={point.date} className="flex flex-col items-center gap-2 h-full justify-end">
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {point.turns > 0 ? `${point.accuracy}%` : '—'}
                </span>
                <div className="w-full max-w-[36px] flex-1 flex items-end bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden">
                  <div
                    className="w-full bg-emerald-600 dark:bg-emerald-500 rounded-t-sm transition-all"
                    style={{ height: `${point.turns > 0 ? Math.max(8, point.accuracy) : 4}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {point.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Level Mastery & Weakest Categories */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-4">
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Curriculum Completion by Level
          </h3>
          <div className="space-y-3.5">
            {LEARNING_LEVELS.map((lvl) => {
              const done = lvl.tasks.filter(
                (t) => taskProgress.find((p) => p.taskId === t.id)?.status === 'completed'
              ).length;
              const pct = Math.round((done / lvl.tasks.length) * 100);
              return (
                <div key={lvl.levelNumber} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      0{lvl.levelNumber}. {lvl.name}
                    </span>
                    <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                      {done}/{lvl.tasks.length} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 dark:bg-blue-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vocabulary Manager */}
        <div className="lg:col-span-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-4">
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Learned Vocabulary ({vocabulary.length})
            </h3>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
              {vocabulary.filter((v) => v.mastered).length} mastered
            </span>
          </div>

          {vocabulary.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-6">
              Practice conversations with your AI teacher to collect vocabulary words and Malayalam
              translations here.
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {vocabulary.map((v) => (
                <div key={v.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
                        {v.word}
                      </span>
                      <span className="malayalam-text text-xs text-blue-700 dark:text-blue-400">
                        {v.meaningMalayalam}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {v.exampleSentence}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => speakEnglishText(`${v.word}. ${v.exampleSentence}`)}
                      className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      aria-label={`Pronounce ${v.word}`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleMastered(v.id)}
                      className={`px-2 py-1 rounded text-xs font-medium inline-flex items-center gap-1 cursor-pointer ${
                        v.mastered
                          ? 'bg-emerald-600 text-white'
                          : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      {v.mastered ? 'Mastered' : 'Mark'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Recent Sessions Table */}
      <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Recent Practice Sessions
          </h3>
        </div>
        {analytics.recentSessions.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 dark:text-slate-400">
            No completed sessions yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-6">Session</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4 text-right">Turns</th>
                  <th className="py-3 px-4 text-right">Accuracy</th>
                  <th className="py-3 px-6 text-right">Speaking Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {analytics.recentSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-6 font-medium text-slate-900 dark:text-white">
                      {s.title}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                      {s.mode}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">{s.turns}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {s.turns > 0 ? `${s.accuracy}%` : '—'}
                    </td>
                    <td className="py-3 px-6 text-right font-mono tabular-nums">
                      {s.speakingSeconds}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
