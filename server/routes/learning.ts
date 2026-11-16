import { Router } from 'express';
import { LEARNING_LEVELS } from '../../src/data/curriculum';
import type { AnalyticsSummary, DailyActivityPoint, GrammarCategory } from '../../src/types/fluency';
import { dbStore } from '../db/store';
import { type AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { generateRevisionDrill } from '../services/gemini';

export const learningRouter = Router();

function buildWeeklySeries(
  logs: Array<{ date: string; speakingSeconds: number; turns: number; correctTurns: number }>
): DailyActivityPoint[] {
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const points: DailyActivityPoint[] = [];

  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - offset);
    const iso = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    const entry = byDate.get(iso);
    const turns = entry?.turns || 0;
    const correctTurns = entry?.correctTurns || 0;
    points.push({
      date: iso,
      label,
      speakingMinutes: Math.round(((entry?.speakingSeconds || 0) / 60) * 10) / 10,
      turns,
      correctTurns,
      accuracy: turns > 0 ? Math.round((correctTurns / turns) * 100) : 0,
    });
  }
  return points;
}

learningRouter.get('/dashboard', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const [user, taskProgress, mistakes, vocabulary, dailyLogs, sessions] = await Promise.all([
      dbStore.findUserById(userId),
      dbStore.getTaskProgress(userId),
      dbStore.getMistakes(userId),
      dbStore.getVocabulary(userId),
      dbStore.getDailyLogs(userId),
      dbStore.listSessions(userId),
    ]);

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const todayLog = dailyLogs.find((l) => l.date === today);

    const categoryMap = new Map<GrammarCategory, { count: number; resolvedCount: number }>();
    for (const m of mistakes) {
      if (m.severity !== 'genuine_error') continue;
      const cur = categoryMap.get(m.category) || { count: 0, resolvedCount: 0 };
      cur.count += m.occurrences;
      cur.resolvedCount += m.resolvedCount;
      categoryMap.set(m.category, cur);
    }

    const weakestCategories = Array.from(categoryMap.entries())
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.count - a.count);

    const tasksCompleted = taskProgress.filter((t) => t.status === 'completed').length;
    const totalTasks = LEARNING_LEVELS.reduce((sum, lvl) => sum + lvl.tasks.length, 0);
    const grammarAccuracy =
      user.totalTurns > 0 ? Math.round((user.correctTurns / user.totalTurns) * 100) : 0;

    const analytics: AnalyticsSummary = {
      streakDays: user.streakDays,
      totalSpeakingSeconds: user.totalSpeakingSeconds,
      todaySpeakingSeconds: todayLog?.speakingSeconds || 0,
      dailyGoalMinutes: user.dailyGoalMinutes,
      grammarAccuracy,
      tasksCompleted,
      totalTasks,
      vocabularyCount: vocabulary.length,
      totalMistakesLogged: mistakes.reduce((sum, m) => sum + m.occurrences, 0),
      weakestCategories,
      weeklySeries: buildWeeklySeries(dailyLogs),
      recentSessions: sessions.slice(0, 6).map((s) => ({
        id: s.id,
        title: s.title,
        mode: s.mode,
        turns: s.turns,
        accuracy: s.turns > 0 ? Math.round((s.correctTurns / s.turns) * 100) : 0,
        speakingSeconds: s.speakingSeconds,
        updatedAt: s.updatedAt,
      })),
    };

    res.json({
      user,
      taskProgress,
      recentMistakes: mistakes.slice(0, 6),
      vocabulary: vocabulary.slice(0, 12),
      analytics,
    });
  } catch (err: any) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: err?.message || 'Failed to load dashboard data.' });
  }
});

learningRouter.get('/journey', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const [user, taskProgress] = await Promise.all([
      dbStore.findUserById(userId),
      dbStore.getTaskProgress(userId),
    ]);
    res.json({ user, levels: LEARNING_LEVELS, taskProgress });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to load learning journey.' });
  }
});

learningRouter.post('/journey/retry', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { taskId } = req.body || {};
    if (!taskId || typeof taskId !== 'string') {
      res.status(400).json({ error: 'taskId is required.' });
      return;
    }
    await dbStore.resetTaskForRetry(req.userId!, taskId);
    const taskProgress = await dbStore.getTaskProgress(req.userId!);
    res.json({ taskProgress });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to reset task for retry.' });
  }
});

learningRouter.get('/mistakes', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const mistakes = await dbStore.getMistakes(req.userId!);
    res.json({ mistakes });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch mistake memory.' });
  }
});

learningRouter.post('/mistakes/:id/resolve', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await dbStore.markMistakeResolved(req.userId!, String(req.params.id));
    if (!updated) {
      res.status(404).json({ error: 'Mistake record not found.' });
      return;
    }
    res.json({ mistake: updated });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update mistake record.' });
  }
});

learningRouter.post('/mistakes/revision', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const [user, mistakes] = await Promise.all([
      dbStore.findUserById(userId),
      dbStore.getMistakes(userId),
    ]);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const drill = await generateRevisionDrill(user.currentLevel, mistakes);
    res.json({ drill });
  } catch (err: any) {
    console.error('Revision generation error:', err);
    res.status(500).json({ error: err?.message || 'Unable to generate personalized revision.' });
  }
});

learningRouter.get('/vocabulary', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const vocabulary = await dbStore.getVocabulary(req.userId!);
    res.json({ vocabulary });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch vocabulary.' });
  }
});

learningRouter.post('/vocabulary/:id/toggle', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await dbStore.toggleVocabularyMastered(req.userId!, String(req.params.id));
    if (!updated) {
      res.status(404).json({ error: 'Vocabulary entry not found.' });
      return;
    }
    res.json({ item: updated });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update vocabulary status.' });
  }
});
