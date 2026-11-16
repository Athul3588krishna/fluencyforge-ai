import { Check, CheckCircle2, Loader2, RefreshCw, Sparkles, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { apiRequest } from '../lib/api';
import { speakEnglishText } from '../lib/speech';
import type { GrammarCategory, MistakeItem, RevisionDrill } from '../types/fluency';

interface MistakeMemoryViewProps {
  mistakes: MistakeItem[];
  onMistakeResolved: (updated: MistakeItem) => void;
  onPracticeMistakeInChat: (mistake: MistakeItem) => void;
}

const CATEGORIES: Array<'All' | GrammarCategory> = [
  'All',
  'Tenses',
  'Articles',
  'Prepositions',
  'Subject-Verb Agreement',
  'Sentence Structure',
  'Vocabulary',
  'Word Order',
];

export function MistakeMemoryView({
  mistakes,
  onMistakeResolved,
  onPracticeMistakeInChat,
}: MistakeMemoryViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<'All' | GrammarCategory>('All');
  const [drill, setDrill] = useState<RevisionDrill | null>(null);
  const [loadingDrill, setLoadingDrill] = useState(false);
  const [drillError, setDrillError] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const categoryCounts = new Map<GrammarCategory, number>();
  for (const m of mistakes) {
    categoryCounts.set(m.category, (categoryCounts.get(m.category) || 0) + m.occurrences);
  }
  const sortedWeakAreas = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1]);

  const filtered =
    selectedCategory === 'All'
      ? mistakes
      : mistakes.filter((m) => m.category === selectedCategory);

  const handleGenerateRevision = async () => {
    setLoadingDrill(true);
    setDrillError(null);
    try {
      const res = await apiRequest<{ drill: RevisionDrill }>('/api/learning/mistakes/revision', {
        method: 'POST',
      });
      setDrill(res.drill);
      setUserAnswers({});
      setRevealed({});
    } catch (err: any) {
      setDrillError(err?.message || 'Unable to generate revision drill.');
    } finally {
      setLoadingDrill(false);
    }
  };

  const handleMarkResolved = async (id: string) => {
    try {
      const res = await apiRequest<{ mistake: MistakeItem }>(`/api/learning/mistakes/${id}/resolve`, {
        method: 'POST',
      });
      onMistakeResolved(res.mistake);
    } catch {
      // ignore error
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl space-y-1.5">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Mistake Memory &amp; Personalized Revision
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Every repeated mistake is tracked automatically so your AI teacher can generate custom
            revision drills targeting your weakest grammar rules.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerateRevision}
          disabled={loadingDrill}
          className="px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
        >
          {loadingDrill ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>{loadingDrill ? 'Building Revision...' : 'Generate Personalized Revision'}</span>
        </button>
      </div>

      {drillError && (
        <div className="p-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-sm text-red-700 dark:text-red-300">
          {drillError}
        </div>
      )}

      {/* Personalized Revision Interactive Drill */}
      {drill && (
        <section className="border border-blue-200 dark:border-blue-900/60 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 space-y-1">
            <div className="text-xs font-mono text-blue-700 dark:text-blue-400 font-semibold">
              Personalized Revision Drill
            </div>
            <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              {drill.focusSummary}
            </h3>
            {drill.focusMalayalam && (
              <p className="malayalam-text text-sm text-slate-600 dark:text-slate-300">
                {drill.focusMalayalam}
              </p>
            )}
          </div>

          <div className="space-y-5">
            {drill.items.map((item, idx) => {
              const userVal = userAnswers[item.id] || '';
              const isMatch =
                userVal.trim().toLowerCase().replace(/[.!?]/g, '') ===
                item.targetAnswer.trim().toLowerCase().replace(/[.!?]/g, '');

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                    <span>
                      Drill {idx + 1} · {item.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => speakEnglishText(item.targetAnswer)}
                      className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      Hear Target
                    </button>
                  </div>

                  <div className="text-sm text-red-700 dark:text-red-300 line-through">
                    {item.brokenSentence}
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {item.promptQuestion}
                  </p>
                  <p className="malayalam-text text-xs text-slate-600 dark:text-slate-400">
                    Hint: {item.hintMalayalam}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={userVal}
                      onChange={(e) =>
                        setUserAnswers((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      placeholder="Type the corrected English sentence..."
                      className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setRevealed((prev) => ({ ...prev, [item.id]: true }))}
                      className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                    >
                      Check / Reveal
                    </button>
                  </div>

                  {(revealed[item.id] || isMatch) && (
                    <div
                      className={`text-xs p-2.5 rounded-lg border ${
                        isMatch
                          ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {isMatch ? 'Exact match! ' : 'Target Answer: '}
                      <span className="font-semibold">{item.targetAnswer}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Weak Grammar Areas Breakdown */}
      {sortedWeakAreas.length > 0 && (
        <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {sortedWeakAreas.map(([cat, count]) => (
            <div
              key={cat}
              className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4"
            >
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{cat}</div>
              <div className="font-mono text-xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                {count}x
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Mistakes List */}
      <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
        {filtered.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              No saved mistakes in this category yet
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Practice speaking with your AI teacher, and repeated mistakes will be organized here.
            </p>
          </div>
        ) : (
          filtered.map((m) => (
            <div key={m.id} className="p-5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {m.category} · Occurred {m.occurrences}x · Revised {m.resolvedCount}x
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => speakEnglishText(m.correctedSentence)}
                    className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Listen
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkResolved(m.id)}
                    className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Mark Revised
                  </button>
                  <button
                    type="button"
                    onClick={() => onPracticeMistakeInChat(m)}
                    className="px-2.5 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Practice with Teacher
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="text-slate-600 dark:text-slate-400 line-through decoration-red-500/70">
                  {m.originalSentence}
                </div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {m.correctedSentence}
                </div>
              </div>

              <p className="malayalam-text text-xs text-slate-700 dark:text-slate-300">
                {m.explanationMalayalam}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{m.ruleSummary}</p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
