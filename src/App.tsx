import {
  BarChart3,
  BookOpen,
  Compass,
  LayoutDashboard,
  Loader2,
  Menu,
  MessageSquare,
  Moon,
  Repeat,
  Sun,
  User,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ActivitiesView } from './components/ActivitiesView';
import { type ActiveSession, AITeacherWorkspace } from './components/AITeacherWorkspace';
import { AnalyticsView } from './components/AnalyticsView';
import { AssessmentModal } from './components/AssessmentModal';
import { AuthLandingView } from './components/AuthLandingView';
import { DashboardView } from './components/DashboardView';
import { JourneyView } from './components/JourneyView';
import { MistakeMemoryView } from './components/MistakeMemoryView';
import { ProfileModal } from './components/ProfileModal';
import { LEVEL_NAMES } from './data/curriculum';
import { apiRequest, getAuthToken, setAuthToken } from './lib/api';
import type {
  ActivitySlug,
  AnalyticsSummary,
  MistakeItem,
  TaskProgressRecord,
  UserProfile,
  VocabularyEntry,
} from './types/fluency';

type NavTab = 'dashboard' | 'teacher' | 'journey' | 'activities' | 'mistakes' | 'analytics';

const NAV_ITEMS: Array<{ id: NavTab; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'teacher', label: 'AI Teacher', icon: MessageSquare },
  { id: 'journey', label: 'Learning Journey', icon: Compass },
  { id: 'activities', label: 'Practice Activities', icon: BookOpen },
  { id: 'mistakes', label: 'Mistake Memory', icon: Repeat },
  { id: 'analytics', label: 'Progress Analytics', icon: BarChart3 },
];

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
      return 'dark';
    }
    return 'light';
  });

  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [taskProgress, setTaskProgress] = useState<TaskProgressRecord[]>([]);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyEntry[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);

  const [sessionsList, setSessionsList] = useState<ActiveSession[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  const [showAssessment, setShowAssessment] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem('ff_theme', next);
    } catch {
      // ignore
    }
  };

  const loadWorkspaceData = useCallback(async () => {
    const [dash, allMistakes, allVocab, sessionsRes] = await Promise.all([
      apiRequest<{
        user: UserProfile;
        taskProgress: TaskProgressRecord[];
        recentMistakes: MistakeItem[];
        vocabulary: VocabularyEntry[];
        analytics: AnalyticsSummary;
      }>('/api/learning/dashboard'),
      apiRequest<{ mistakes: MistakeItem[] }>('/api/learning/mistakes'),
      apiRequest<{ vocabulary: VocabularyEntry[] }>('/api/learning/vocabulary'),
      apiRequest<{ sessions: ActiveSession[] }>('/api/chat/sessions'),
    ]);

    setUser(dash.user);
    setTaskProgress(dash.taskProgress);
    setMistakes(allMistakes.mistakes);
    setVocabulary(allVocab.vocabulary);
    setAnalytics(dash.analytics);
    setSessionsList(sessionsRes.sessions);

    if (sessionsRes.sessions.length > 0 && !activeSession) {
      setActiveSession(sessionsRes.sessions[0]);
    }
  }, [activeSession]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setBooting(false);
      return;
    }

    apiRequest<{ user: UserProfile }>('/api/auth/me')
      .then(async (res) => {
        setUser(res.user);
        if (!res.user.assessmentCompleted) {
          setShowAssessment(true);
        }
        await loadWorkspaceData();
      })
      .catch(() => {
        setAuthToken(null);
        setUser(null);
      })
      .finally(() => {
        setBooting(false);
      });
  }, []);

  const handleAuthenticated = async (authedUser: UserProfile) => {
    setUser(authedUser);
    if (!authedUser.assessmentCompleted) {
      setShowAssessment(true);
    }
    await loadWorkspaceData();
  };

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    setActiveSession(null);
    setSessionsList([]);
    setShowProfile(false);
    setShowAssessment(false);
    setActiveTab('dashboard');
  };

  const startSession = async (payload: {
    taskId?: string;
    activitySlug?: ActivitySlug;
    pictureSceneId?: 'market' | 'office' | 'station';
    customTopic?: string;
  }) => {
    setStartingSession(true);
    setGlobalError(null);
    try {
      const res = await apiRequest<{ session: ActiveSession }>('/api/chat/start', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setActiveSession(res.session);
      setSessionsList((prev) => [res.session, ...prev]);
      setActiveTab('teacher');
      setMobileNavOpen(false);
    } catch (err: any) {
      setGlobalError(err?.message || 'Could not start coaching session.');
    } finally {
      setStartingSession(false);
    }
  };

  const handleUserUpdated = async (
    updatedUser: UserProfile,
    updatedProgress?: TaskProgressRecord[]
  ) => {
    setUser(updatedUser);
    if (updatedProgress) {
      setTaskProgress(updatedProgress);
    }
    try {
      const [dash, allMistakes, allVocab] = await Promise.all([
        apiRequest<{ analytics: AnalyticsSummary }>('/api/learning/dashboard'),
        apiRequest<{ mistakes: MistakeItem[] }>('/api/learning/mistakes'),
        apiRequest<{ vocabulary: VocabularyEntry[] }>('/api/learning/vocabulary'),
      ]);
      setAnalytics(dash.analytics);
      setMistakes(allMistakes.mistakes);
      setVocabulary(allVocab.vocabulary);
    } catch {
      // keep optimistic update
    }
  };

  const handleSessionChange = (updated: ActiveSession) => {
    setActiveSession(updated);
    setSessionsList((prev) => {
      const exists = prev.some((s) => s.id === updated.id);
      return exists ? prev.map((s) => (s.id === updated.id ? updated : s)) : [updated, ...prev];
    });
  };

  const handleOpenTeacherTab = async () => {
    setActiveTab('teacher');
    setMobileNavOpen(false);
    if (!activeSession) {
      await startSession({});
    }
  };

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-600 dark:text-slate-300 gap-2.5 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading FluencyForge AI...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthLandingView
        theme={theme}
        onToggleTheme={toggleTheme}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  const currentNavMeta = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 h-screen shrink-0">
        <div className="h-16 px-6 flex items-center border-b border-slate-200 dark:border-slate-800">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            FluencyForge AI
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  item.id === 'teacher' ? handleOpenTeacherTab() : setActiveTab(item.id)
                }
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="px-2">
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Level 0{user.currentLevel}
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {LEVEL_NAMES[user.currentLevel]}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowProfile(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <User className="w-4 h-4 shrink-0" />
            <span className="truncate">{user.name}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 h-full flex flex-col p-4 z-10">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <span className="font-display text-lg font-bold text-slate-900 dark:text-white">
                FluencyForge AI
              </span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 text-slate-500"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === 'teacher') {
                        handleOpenTeacherTab();
                      } else {
                        setActiveTab(item.id);
                        setMobileNavOpen(false);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
                      active
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen(false);
                setShowProfile(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium"
            >
              <User className="w-4 h-4" />
              <span className="truncate">{user.name}</span>
            </button>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 px-5 lg:px-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white truncate">
              {currentNavMeta.label}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
              aria-label="Toggle light or dark mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => startSession({})}
              disabled={startingSession}
              className="px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {startingSession && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Quick Speak</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-8 max-w-7xl w-full mx-auto">
          {globalError && (
            <div className="mb-6 p-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-sm text-red-700 dark:text-red-300">
              {globalError}
            </div>
          )}

          {activeTab === 'dashboard' && analytics && (
            <DashboardView
              user={user}
              analytics={analytics}
              taskProgress={taskProgress}
              recentMistakes={mistakes.slice(0, 5)}
              vocabulary={vocabulary}
              onStartTask={(taskId) => startSession({ taskId })}
              onStartFreePractice={() => startSession({})}
              onNavigate={(tab) => setActiveTab(tab)}
              onPracticeMistake={(m) =>
                startSession({
                  customTopic: `${m.category}: Fix "${m.originalSentence}" to "${m.correctedSentence}"`,
                })
              }
            />
          )}

          {activeTab === 'teacher' && (
            <AITeacherWorkspace
              user={user}
              session={activeSession}
              sessionsList={sessionsList}
              taskProgress={taskProgress}
              onSessionChange={handleSessionChange}
              onUserUpdated={handleUserUpdated}
              onStartNewFreeChat={() => startSession({})}
              onSwitchPictureScene={(sceneId) =>
                startSession({ activitySlug: 'picture-description', pictureSceneId: sceneId })
              }
            />
          )}

          {activeTab === 'journey' && (
            <JourneyView
              currentLevel={user.currentLevel}
              taskProgress={taskProgress}
              onStartTask={(taskId) => startSession({ taskId })}
              onProgressUpdated={(prog) => setTaskProgress(prog)}
            />
          )}

          {activeTab === 'activities' && (
            <ActivitiesView
              onStartActivity={(slug, sceneId) =>
                startSession({ activitySlug: slug, pictureSceneId: sceneId })
              }
            />
          )}

          {activeTab === 'mistakes' && (
            <MistakeMemoryView
              mistakes={mistakes}
              onMistakeResolved={(updated) =>
                setMistakes((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
              }
              onPracticeMistakeInChat={(m) =>
                startSession({
                  customTopic: `${m.category}: Fix "${m.originalSentence}" to "${m.correctedSentence}"`,
                })
              }
            />
          )}

          {activeTab === 'analytics' && analytics && (
            <AnalyticsView
              analytics={analytics}
              taskProgress={taskProgress}
              vocabulary={vocabulary}
              onVocabularyUpdated={(item) =>
                setVocabulary((prev) => prev.map((v) => (v.id === item.id ? item : v)))
              }
            />
          )}
        </main>
      </div>

      {showAssessment && (
        <AssessmentModal
          user={user}
          onComplete={async (updatedUser) => {
            setUser(updatedUser);
            setShowAssessment(false);
            await loadWorkspaceData();
          }}
          onClose={() => setShowAssessment(false)}
        />
      )}

      {showProfile && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onUpdated={(u) => setUser(u)}
          onRetakeAssessment={() => {
            setShowProfile(false);
            setShowAssessment(true);
          }}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
