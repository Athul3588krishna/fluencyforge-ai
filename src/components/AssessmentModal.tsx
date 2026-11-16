import { CheckCircle2, Loader2, Mic, MicOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ASSESSMENT_PROMPTS, LEVEL_NAMES } from '../data/curriculum';
import { apiRequest } from '../lib/api';
import { createSpeechRecognizer, isSpeechRecognitionSupported } from '../lib/speech';
import type { GrammarCategory, LevelNumber, UserProfile } from '../types/fluency';

interface AssessmentModalProps {
  user: UserProfile;
  onComplete: (updatedUser: UserProfile) => void;
  onClose?: () => void;
}

export function AssessmentModal({ user, onComplete, onClose }: AssessmentModalProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({
    q1: '',
    q2: '',
    q3: '',
    q4: '',
    q5: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMicField, setActiveMicField] = useState<string | null>(null);
  const [result, setResult] = useState<{
    user: UserProfile;
    evaluation: {
      recommendedLevel: LevelNumber;
      summary: string;
      malayalamFeedback: string;
      detectedWeakAreas: GrammarCategory[];
    };
  } | null>(null);

  const recognizerRef = useRef<ReturnType<typeof createSpeechRecognizer> | null>(null);

  useEffect(() => {
    return () => {
      recognizerRef.current?.stop();
    };
  }, []);

  const toggleVoiceForField = (fieldId: string) => {
    if (activeMicField === fieldId) {
      recognizerRef.current?.stop();
      setActiveMicField(null);
      return;
    }

    recognizerRef.current?.stop();
    const baseText = answers[fieldId] || '';
    const recognizer = createSpeechRecognizer({
      onTranscript: (finalText, interimText) => {
        const combined = [baseText, finalText, interimText].filter(Boolean).join(' ').trim();
        setAnswers((prev) => ({ ...prev, [fieldId]: combined }));
      },
      onError: (msg) => {
        setError(msg);
        setActiveMicField(null);
      },
      onEnd: () => {
        setActiveMicField(null);
      },
    });

    if (!recognizer) {
      setError('Speech recognition is not supported in this browser. Please type your response.');
      return;
    }

    setError(null);
    recognizerRef.current = recognizer;
    setActiveMicField(fieldId);
    recognizer.start();
  };

  const allAnswered = ASSESSMENT_PROMPTS.every((q) => (answers[q.id] || '').trim().length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allAnswered) return;
    recognizerRef.current?.stop();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiRequest<{
        user: UserProfile;
        evaluation: {
          recommendedLevel: LevelNumber;
          summary: string;
          malayalamFeedback: string;
          detectedWeakAreas: GrammarCategory[];
        };
      }>('/api/auth/assessment', {
        method: 'POST',
        body: JSON.stringify(answers),
      });
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to evaluate placement check.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:p-8 my-8">
        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                  Initial Proficiency Assessment · {user.name}
                </p>
                <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  Find your starting English level
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Answer 5 quick questions by clicking or speaking/typing. Your AI teacher will place
                  you in the ideal level.
                </p>
              </div>
              {onClose && user.assessmentCompleted && (
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {ASSESSMENT_PROMPTS.map((q, idx) => (
                <div
                  key={q.id}
                  className="space-y-2.5 pb-5 border-b border-slate-100 dark:border-slate-800 last:border-b-0 last:pb-0"
                >
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {idx + 1}. {q.prompt}
                  </div>
                  {q.hintMalayalam && (
                    <p className="malayalam-text text-xs text-slate-500 dark:text-slate-400">
                      {q.hintMalayalam}
                    </p>
                  )}

                  {q.type === 'choice' && q.options ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {q.options.map((opt) => {
                        const selected = answers[q.id] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                            className={`text-left px-3.5 py-2.5 rounded-lg border text-sm transition-colors cursor-pointer ${
                              selected
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 font-medium'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={answers[q.id] || ''}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                        }
                        placeholder="Type or speak your answer in English..."
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      {isSpeechRecognitionSupported() && (
                        <button
                          type="button"
                          onClick={() => toggleVoiceForField(q.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                            activeMicField === q.id
                              ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                              : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          {activeMicField === q.id ? (
                            <>
                              <MicOff className="w-3.5 h-3.5" />
                              Stop Dictation
                            </>
                          ) : (
                            <>
                              <Mic className="w-3.5 h-3.5" />
                              Speak Answer
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={!allAnswered || submitting}
                className="px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{submitting ? 'Evaluating with AI Teacher...' : 'Submit Assessment'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <div className="text-xs font-mono">
                  Assessment Complete · Level {result.evaluation.recommendedLevel}
                </div>
                <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                  Starting Level: {LEVEL_NAMES[result.evaluation.recommendedLevel]}
                </h2>
              </div>
            </div>

            <div className="space-y-4 border-t border-b border-slate-200 dark:border-slate-800 py-5">
              <div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Teacher Evaluation
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                  {result.evaluation.summary}
                </p>
              </div>
              {result.evaluation.malayalamFeedback && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Malayalam Feedback (മലയാളം)
                  </div>
                  <p className="malayalam-text text-sm text-slate-800 dark:text-slate-200">
                    {result.evaluation.malayalamFeedback}
                  </p>
                </div>
              )}
              {result.evaluation.detectedWeakAreas.length > 0 && (
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Focus areas to strengthen:{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {result.evaluation.detectedWeakAreas.join(' · ')}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onComplete(result.user)}
                className="px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-semibold cursor-pointer"
              >
                Enter FluencyForge Workspace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
