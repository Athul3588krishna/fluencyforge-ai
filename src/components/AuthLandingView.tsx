import { ArrowRight, BookOpen, Check, Mic, Moon, Sun, Volume2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { LEVEL_NAMES, PRACTICE_ACTIVITIES } from '../data/curriculum';
import { HERO_WORKSPACE_IMAGE } from '../lib/activityImages';
import { apiRequest, setAuthToken } from '../lib/api';
import { speakEnglishText } from '../lib/speech';
import type { UserProfile } from '../types/fluency';

interface AuthLandingViewProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onAuthenticated: (user: UserProfile) => void;
}

export function AuthLandingView({ theme, onToggleTheme, onAuthenticated }: AuthLandingViewProps) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const payload = mode === 'signup' ? { name, email, password } : { email, password };
      const res = await apiRequest<{ token: string; user: UserProfile }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setAuthToken(res.token);
      onAuthenticated(res.user);
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const focusAuth = () => {
    emailInputRef.current?.focus();
    emailInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100">
      {/* Three-Zone Top Bar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            FluencyForge AI
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a
              href="#correction-method"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Malayalam Coach
            </a>
            <a
              href="#curriculum"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              6-Level Journey
            </a>
            <a
              href="#activities"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Practice Activities
            </a>
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              aria-label="Toggle light or dark theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={focusAuth}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Start Practicing
            </button>
          </div>
        </div>
      </header>

      {/* Hero Split */}
      <main id="top" className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          {/* Left Showcase */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-8">
            <div className="space-y-5">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                Personal English Communication Coach · Voice &amp; Text · Malayalam Explanations
              </p>
              <h1
                className="font-display text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.12]"
                style={{ textWrap: 'balance' }}
              >
                Speak English with clarity, backed by honest grammar coaching.
              </h1>
              <p className="text-base lg:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Practice speaking and writing every day with a supportive AI teacher that catches every
                genuine mistake, explains the exact rule in simple Malayalam, and remembers your weak
                areas over time.
              </p>
            </div>

            {/* Live Correction Demonstration */}
            <div
              id="correction-method"
              className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                  Real Coaching Sample · Tenses
                </span>
                <button
                  type="button"
                  onClick={() => speakEnglishText('Yesterday I went to college.')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Listen to Correction
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-red-700 dark:text-red-400">
                    Your Sentence
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200 line-through decoration-red-500/70">
                    Yesterday I am going to college.
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Corrected English
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Yesterday I went to college.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Malayalam Explanation (മലയാളം വിശദീകരണം)
                </div>
                <p className="malayalam-text text-sm text-slate-800 dark:text-slate-200">
                  Yesterday എന്നത് കഴിഞ്ഞ ദിവസത്തെ സൂചിപ്പിക്കുന്നു. അതിനാൽ past tense ഉപയോഗിക്കണം.
                  Go എന്നതിന്റെ past form Went ആണ്.
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 h-52 bg-slate-100 dark:bg-slate-800">
              {!imageFailed ? (
                <img
                  src={HERO_WORKSPACE_IMAGE}
                  alt="Calm study desk with notebook, pen, tea, and headphones for daily English practice"
                  referrerPolicy="no-referrer"
                  onError={() => setImageFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-slate-400 gap-2">
                  <BookOpen className="w-5 h-5" />
                  <span className="text-sm font-medium">FluencyForge Study Workspace</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Auth Panel */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-7 lg:p-8 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className={`flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    mode === 'signup'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    mode === 'login'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Sign In
                </button>
              </div>

              <div className="mb-6">
                <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                  {mode === 'signup' ? 'Begin your 24/7 English coaching' : 'Welcome back, learner'}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {mode === 'signup'
                    ? 'Includes a 2-minute initial proficiency check to place you in the right level.'
                    : 'Sign in to continue your daily streak, tasks, and mistake revision.'}
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-4 p-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-sm text-red-700 dark:text-red-300"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label
                      htmlFor="auth-name"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      Full Name
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Arjun Nair"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Email Address
                  </label>
                  <input
                    ref={emailInputRef}
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="auth-password"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Password
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-60 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>
                    {loading
                      ? mode === 'signup'
                        ? 'Creating Account...'
                        : 'Signing In...'
                      : mode === 'signup'
                      ? 'Create Account & Start Assessment'
                      : 'Sign In to Workspace'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-400">
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-white inline-flex items-center gap-1">
                    <Mic className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Voice + Text
                  </div>
                  <p>Live transcript &amp; TTS replay</p>
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-white">6 Levels</div>
                  <p>Beginner to Advanced Fluency</p>
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-white">Mistake Memory</div>
                  <p>Personalized daily revisions</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6 Progressive Levels Summary */}
        <section id="curriculum" className="mt-16 pt-12 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-2xl mb-8">
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
              Structured 6-Level Learning Journey
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Each stage unlocks sequentially as you complete speaking and grammar requirements—never
              overwhelming you, always moving forward.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {([1, 2, 3, 4, 5, 6] as const).map((lvl) => (
              <div
                key={lvl}
                className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 space-y-2"
              >
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  Level 0{lvl} · Sequential Mastery
                </div>
                <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                  {LEVEL_NAMES[lvl]}
                </h3>
              </div>
            ))}
          </div>
        </section>

        {/* 10 Practice Activities Summary */}
        <section id="activities" className="mt-14 pt-12 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-2xl mb-8">
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
              Ten Real-World Practice Activities
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              From daily routines and picture descriptions to mock interviews and group discussions.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PRACTICE_ACTIVITIES.map((act, idx) => (
              <div
                key={act.slug}
                className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 space-y-1.5"
              >
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {String(idx + 1).padStart(2, '0')} · Level {act.recommendedLevel}+
                </div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white">
                  {act.title}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {act.subtitle}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
