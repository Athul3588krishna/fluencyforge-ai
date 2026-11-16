import { ArrowRight, CheckCircle2, Lock, RotateCcw } from 'lucide-react';
import { LEARNING_LEVELS } from '../data/curriculum';
import { apiRequest } from '../lib/api';
import type { LevelNumber, TaskProgressRecord } from '../types/fluency';

interface JourneyViewProps {
  currentLevel: LevelNumber;
  taskProgress: TaskProgressRecord[];
  onStartTask: (taskId: string) => void;
  onProgressUpdated: (progress: TaskProgressRecord[]) => void;
}

export function JourneyView({
  currentLevel,
  taskProgress,
  onStartTask,
  onProgressUpdated,
}: JourneyViewProps) {
  const progressMap = new Map(taskProgress.map((p) => [p.taskId, p]));

  const handleRetry = async (taskId: string) => {
    try {
      const res = await apiRequest<{ taskProgress: TaskProgressRecord[] }>('/api/learning/journey/retry', {
        method: 'POST',
        body: JSON.stringify({ taskId }),
      });
      onProgressUpdated(res.taskProgress);
      onStartTask(taskId);
    } catch {
      onStartTask(taskId);
    }
  };

  return (
    <div className="space-y-8">
      <div className="max-w-2xl space-y-1.5">
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Structured 6-Level Learning Journey
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Complete the required speaking turns in each task to unlock the next lesson. You can
          retry completed tasks anytime to sharpen accuracy.
        </p>
      </div>

      <div className="space-y-6">
        {LEARNING_LEVELS.map((level) => {
          const completedInLevel = level.tasks.filter(
            (t) => progressMap.get(t.id)?.status === 'completed'
          ).length;
          const isCurrent = level.levelNumber === currentLevel;

          return (
            <section
              key={level.levelNumber}
              className={`border rounded-xl p-6 space-y-5 bg-white dark:bg-slate-900 ${
                isCurrent
                  ? 'border-blue-600/60 dark:border-blue-500/60'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    Level 0{level.levelNumber} · {completedInLevel}/{level.tasks.length} Tasks
                    Completed {isCurrent ? '· Current Level' : ''}
                  </div>
                  <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                    {level.name}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
                    {level.description}
                  </p>
                </div>

                <div className="w-36 shrink-0 space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                    <span>Mastery</span>
                    <span>
                      {Math.round((completedInLevel / Math.max(1, level.tasks.length)) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 dark:bg-blue-500"
                      style={{
                        width: `${(completedInLevel / Math.max(1, level.tasks.length)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {level.tasks.map((task) => {
                  const rec = progressMap.get(task.id);
                  const status = rec?.status || 'locked';
                  const isLocked = status === 'locked';
                  const isDone = status === 'completed';

                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between gap-4 ${
                        isLocked
                          ? 'border-slate-200/70 dark:border-slate-800/70 bg-slate-50/70 dark:bg-slate-950/40 opacity-75'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/30'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                          <span>
                            Task {task.order} · {task.grammarFocus}
                          </span>
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Completed
                            </span>
                          ) : isLocked ? (
                            <span className="inline-flex items-center gap-1 text-slate-500">
                              <Lock className="w-3.5 h-3.5" />
                              Locked
                            </span>
                          ) : (
                            <span className="text-blue-700 dark:text-blue-400 font-semibold">
                              Unlocked
                            </span>
                          )}
                        </div>

                        <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                          {task.title}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {task.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          {rec?.turnsCompleted || 0}/{task.requiredTurns} turns
                          {rec && rec.bestAccuracy > 0 ? ` · ${rec.bestAccuracy}% acc` : ''}
                        </span>

                        {isLocked ? (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            Finish previous task
                          </span>
                        ) : isDone ? (
                          <button
                            type="button"
                            onClick={() => handleRetry(task.id)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Retry Task
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onStartTask(task.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                          >
                            <span>
                              {(rec?.turnsCompleted || 0) > 0 ? 'Continue' : 'Start Lesson'}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
