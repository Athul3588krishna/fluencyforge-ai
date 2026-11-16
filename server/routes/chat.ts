import crypto from 'crypto';
import { Router } from 'express';
import {
  LEARNING_LEVELS,
  LEVEL_NAMES,
  PICTURE_SCENES,
  PRACTICE_ACTIVITIES,
} from '../../src/data/curriculum';
import type { ChatMessage } from '../../src/types/fluency';
import { dbStore } from '../db/store';
import { type AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { analyzeTurnWithTutor } from '../services/gemini';

export const chatRouter = Router();

chatRouter.get('/sessions', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const sessions = await dbStore.listSessions(req.userId!);
    res.json({ sessions });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to load conversation history.' });
  }
});

chatRouter.get('/sessions/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const session = await dbStore.getSession(req.userId!, String(req.params.id));
    if (!session) {
      res.status(404).json({ error: 'Session not found.' });
      return;
    }
    res.json({ session });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to load conversation.' });
  }
});

chatRouter.post('/start', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const { taskId, activitySlug, pictureSceneId, customTopic } = req.body || {};
    const user = await dbStore.findUserById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    let title = `Free Practice · ${LEVEL_NAMES[user.currentLevel]}`;
    let mode = 'free-practice';
    let starter = `Hi ${user.name}! I am your FluencyForge AI English teacher. Let's have a natural conversation today—what did you do this morning, or how is your day going so far?`;

    if (taskId) {
      const allTasks = LEARNING_LEVELS.flatMap((l) => l.tasks);
      const task = allTasks.find((t) => t.id === taskId);
      if (!task) {
        res.status(404).json({ error: 'Curriculum task not found.' });
        return;
      }
      const progress = await dbStore.getTaskProgress(userId);
      const record = progress.find((p) => p.taskId === taskId);
      if (record?.status === 'locked') {
        res.status(403).json({ error: 'Complete the previous task first to unlock this lesson.' });
        return;
      }
      title = `Level ${task.levelNumber}: ${task.title}`;
      mode = 'curriculum-task';
      starter = task.starterPrompt;
    } else if (activitySlug) {
      const activity = PRACTICE_ACTIVITIES.find((a) => a.slug === activitySlug);
      if (!activity) {
        res.status(404).json({ error: 'Practice activity not found.' });
        return;
      }
      title = activity.title;
      mode = `activity:${activity.slug}`;
      starter = activity.starterPrompt;
      if (activity.slug === 'picture-description') {
        const scene =
          PICTURE_SCENES.find((s) => s.id === pictureSceneId) || PICTURE_SCENES[0];
        title = `Picture Description · ${scene.title}`;
      }
    } else if (customTopic && typeof customTopic === 'string') {
      title = customTopic.slice(0, 60);
      mode = 'revision';
      starter = `Let's practice fixing this pattern: ${customTopic}`;
    }

    const openingMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: starter,
      followUpQuestion: starter,
      timestamp: new Date().toISOString(),
    };

    const session = await dbStore.createSession({
      userId,
      title,
      mode,
      taskId: taskId || null,
      activitySlug: activitySlug || null,
      pictureSceneId: pictureSceneId || null,
      initialMessages: [openingMessage],
    });

    res.status(201).json({ session });
  } catch (err: any) {
    console.error('Start chat error:', err);
    res.status(500).json({ error: err?.message || 'Unable to start conversation session.' });
  }
});

chatRouter.post('/turn', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const { sessionId, message, inputMode, speakingSeconds } = req.body || {};

    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ error: 'sessionId is required.' });
      return;
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Please say or type your English response first.' });
      return;
    }

    const [user, session, existingMistakes] = await Promise.all([
      dbStore.findUserById(userId),
      dbStore.getSession(userId, sessionId),
      dbStore.getMistakes(userId),
    ]);

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    if (!session) {
      res.status(404).json({ error: 'Conversation session not found.' });
      return;
    }

    const weakAreas = Array.from(
      new Set(
        existingMistakes
          .filter((m) => m.severity === 'genuine_error')
          .sort((a, b) => b.occurrences - a.occurrences)
          .slice(0, 4)
          .map((m) => m.category)
      )
    );

    let taskContext = '';
    if (session.taskId) {
      const task = LEARNING_LEVELS.flatMap((l) => l.tasks).find((t) => t.id === session.taskId);
      if (task) {
        taskContext = `Structured Task "${task.title}" (Focus: ${task.grammarFocus}). Success criteria: ${task.successCriteria}`;
      }
    } else if (session.activitySlug) {
      const activity = PRACTICE_ACTIVITIES.find((a) => a.slug === session.activitySlug);
      if (activity) {
        taskContext = `Practice Activity "${activity.title}": ${activity.description}.`;
        if (activity.slug === 'picture-description') {
          const scene =
            PICTURE_SCENES.find((s) => s.id === session.pictureSceneId) || PICTURE_SCENES[0];
          taskContext += ` Scene details: ${scene.aiContext}`;
        }
      }
    }

    const cleanMessage = message.trim();
    const spokenSecs = Math.max(4, Math.min(300, Number(speakingSeconds) || Math.ceil(cleanMessage.split(/\s+/).length * 1.4)));

    const analysis = await analyzeTurnWithTutor({
      userLevel: user.currentLevel,
      userName: user.name,
      learnerText: cleanMessage,
      history: session.messages,
      modeLabel: session.title,
      taskContext,
      weakAreas,
    });

    const now = new Date().toISOString();
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: cleanMessage,
      timestamp: now,
      inputMode: inputMode === 'voice' ? 'voice' : 'text',
      speakingSeconds: spokenSecs,
    };

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: analysis.teacherReply,
      followUpQuestion: analysis.followUpQuestion,
      timestamp: new Date().toISOString(),
      isGrammaticallyCorrect: analysis.isGrammaticallyCorrect,
      hasGenuineErrors: analysis.hasGenuineErrors,
      correction: analysis.correction,
      repeatRequired: analysis.hasGenuineErrors && Boolean(analysis.correction?.correctedSentence),
      repeatCompleted: false,
    };

    const updatedSession = await dbStore.appendSessionMessages(
      userId,
      sessionId,
      [userMsg, assistantMsg],
      spokenSecs,
      analysis.isGrammaticallyCorrect
    );

    if (analysis.correction?.mistakes?.length) {
      for (const m of analysis.correction.mistakes) {
        if (m.severity === 'genuine_error') {
          await dbStore.saveMistake({
            userId,
            category: m.category,
            severity: m.severity,
            originalSentence: cleanMessage,
            correctedSentence: analysis.correction.correctedSentence,
            wrongSnippet: m.wrongSnippet || cleanMessage,
            correctedSnippet: m.correctedSnippet || analysis.correction.correctedSentence,
            explanationMalayalam: m.explanationMalayalam || analysis.correction.malayalamExplanation,
            ruleSummary: m.ruleSummary,
          });
        }
      }
    }

    if (analysis.newVocabulary.length > 0) {
      await dbStore.saveVocabulary(userId, analysis.newVocabulary);
    }

    const updatedUser = await dbStore.logPracticeActivity(
      userId,
      spokenSecs,
      analysis.isGrammaticallyCorrect
    );

    let taskUpdate: { unlockedNextTaskId: string | null; levelUpTo: number | null } = {
      unlockedNextTaskId: null,
      levelUpTo: null,
    };
    if (session.taskId) {
      taskUpdate = await dbStore.recordTaskTurn(
        userId,
        session.taskId,
        analysis.isGrammaticallyCorrect,
        analysis.taskEvaluation.metRequirement
      );
    }

    const taskProgress = await dbStore.getTaskProgress(userId);

    res.json({
      session: updatedSession,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      user: updatedUser,
      taskUpdate,
      taskProgress,
    });
  } catch (err: any) {
    console.error('Chat turn error:', err);
    res.status(500).json({
      error: err?.message || 'Unable to analyze your response. Please try again.',
    });
  }
});

chatRouter.post('/mark-repeated', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { sessionId, messageId } = req.body || {};
    if (!sessionId || !messageId) {
      res.status(400).json({ error: 'sessionId and messageId are required.' });
      return;
    }
    await dbStore.markRepeatCompleted(req.userId!, sessionId, messageId);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to mark repeat completed.' });
  }
});
