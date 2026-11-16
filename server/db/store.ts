import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { LEARNING_LEVELS, LEVEL_NAMES } from '../../src/data/curriculum';
import type {
  ChatMessage,
  GrammarCategory,
  LevelNumber,
  MistakeItem,
  MistakeSeverity,
  TaskProgressRecord,
  UserProfile,
  VocabularyEntry,
} from '../../src/types/fluency';
import {
  ConversationSessionModel,
  DailyActivityModel,
  MistakeRecordModel,
  TaskProgressModel,
  UserModel,
  VocabularyModel,
} from '../models/mongooseModels';

export interface StoredUser extends UserProfile {
  passwordHash: string;
}

export interface StoredSession {
  id: string;
  userId: string;
  title: string;
  mode: string;
  taskId: string | null;
  activitySlug: string | null;
  pictureSceneId: string | null;
  messages: ChatMessage[];
  turns: number;
  correctTurns: number;
  speakingSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredDailyLog {
  userId: string;
  date: string;
  speakingSeconds: number;
  turns: number;
  correctTurns: number;
}

interface LocalDatabase {
  users: StoredUser[];
  taskProgress: Array<TaskProgressRecord & { userId: string }>;
  mistakes: MistakeItem[];
  sessions: StoredSession[];
  vocabulary: Array<VocabularyEntry & { userId: string }>;
  dailyLogs: StoredDailyLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'fluencyforge.db.json');

let useMongo = false;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayISO(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function loadLocalDb(): LocalDatabase {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const empty: LocalDatabase = {
        users: [],
        taskProgress: [],
        mistakes: [],
        sessions: [],
        vocabulary: [],
        dailyLogs: [],
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(empty, null, 2), 'utf-8');
      return empty;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as LocalDatabase;
  } catch {
    return {
      users: [],
      taskProgress: [],
      mistakes: [],
      sessions: [],
      vocabulary: [],
      dailyLogs: [],
    };
  }
}

function saveLocalDb(db: LocalDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

export async function initDatabase(): Promise<{ mode: 'mongodb' | 'local' }> {
  const mongoUri = process.env.MONGODB_URI?.trim();
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri);
      useMongo = true;
      console.log('Connected to MongoDB via MONGODB_URI');
      return { mode: 'mongodb' };
    } catch (err) {
      console.error('MongoDB connection failed, falling back to local persistent store:', err);
    }
  }
  loadLocalDb();
  useMongo = false;
  console.log('Database initialized with durable local persistence store (./data/fluencyforge.db.json)');
  return { mode: 'local' };
}

function toPublicUser(doc: any): UserProfile {
  const level = (Math.min(6, Math.max(1, Number(doc.currentLevel) || 1))) as LevelNumber;
  return {
    id: String(doc._id || doc.id),
    name: doc.name,
    email: doc.email,
    currentLevel: level,
    levelName: LEVEL_NAMES[level],
    assessmentCompleted: Boolean(doc.assessmentCompleted),
    assessmentSummary: doc.assessmentSummary || '',
    dailyGoalMinutes: Number(doc.dailyGoalMinutes) || 15,
    streakDays: Number(doc.streakDays) || 0,
    lastActiveDate: doc.lastActiveDate || null,
    totalSpeakingSeconds: Number(doc.totalSpeakingSeconds) || 0,
    totalTurns: Number(doc.totalTurns) || 0,
    correctTurns: Number(doc.correctTurns) || 0,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
  };
}

function buildInitialTasksForLevel(startLevel: LevelNumber): TaskProgressRecord[] {
  const records: TaskProgressRecord[] = [];
  for (const level of LEARNING_LEVELS) {
    for (const task of level.tasks) {
      let status: 'locked' | 'unlocked' | 'completed' = 'locked';
      if (level.levelNumber < startLevel) {
        status = 'completed';
      } else if (level.levelNumber === startLevel && task.order === 1) {
        status = 'unlocked';
      }
      records.push({
        taskId: task.id,
        levelNumber: level.levelNumber,
        status,
        turnsCompleted: 0,
        attempts: 0,
        bestAccuracy: status === 'completed' ? 100 : 0,
        lastPracticedAt: null,
        completedAt: status === 'completed' ? new Date().toISOString() : null,
      });
    }
  }
  return records;
}

export const dbStore = {
  async findUserByEmail(email: string): Promise<StoredUser | null> {
    const normalized = email.trim().toLowerCase();
    if (useMongo) {
      const doc = await UserModel.findOne({ email: normalized }).lean();
      if (!doc) return null;
      return { ...toPublicUser(doc), passwordHash: (doc as any).passwordHash };
    }
    const db = loadLocalDb();
    return db.users.find((u) => u.email.toLowerCase() === normalized) || null;
  },

  async findUserById(userId: string): Promise<UserProfile | null> {
    if (useMongo) {
      const doc = await UserModel.findById(userId).lean();
      return doc ? toPublicUser(doc) : null;
    }
    const db = loadLocalDb();
    const found = db.users.find((u) => u.id === userId);
    if (!found) return null;
    const { passwordHash: _omit, ...pub } = found;
    return pub;
  },

  async createUser(input: { name: string; email: string; passwordHash: string }): Promise<UserProfile> {
    const now = new Date().toISOString();
    if (useMongo) {
      const doc = await UserModel.create({
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        passwordHash: input.passwordHash,
        currentLevel: 1,
        assessmentCompleted: false,
        dailyGoalMinutes: 15,
        streakDays: 0,
        lastActiveDate: null,
        totalSpeakingSeconds: 0,
        totalTurns: 0,
        correctTurns: 0,
      });
      const userId = String(doc._id);
      const initialTasks = buildInitialTasksForLevel(1).map((t) => ({ ...t, userId }));
      await TaskProgressModel.insertMany(initialTasks);
      return toPublicUser(doc);
    }

    const db = loadLocalDb();
    const id = crypto.randomUUID();
    const user: StoredUser = {
      id,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
      currentLevel: 1,
      levelName: LEVEL_NAMES[1],
      assessmentCompleted: false,
      assessmentSummary: '',
      dailyGoalMinutes: 15,
      streakDays: 0,
      lastActiveDate: null,
      totalSpeakingSeconds: 0,
      totalTurns: 0,
      correctTurns: 0,
      createdAt: now,
    };
    db.users.push(user);
    for (const t of buildInitialTasksForLevel(1)) {
      db.taskProgress.push({ ...t, userId: id });
    }
    saveLocalDb(db);
    const { passwordHash: _omit, ...pub } = user;
    return pub;
  },

  async updateUser(
    userId: string,
    patch: Partial<{
      name: string;
      currentLevel: LevelNumber;
      assessmentCompleted: boolean;
      assessmentSummary: string;
      dailyGoalMinutes: number;
    }>
  ): Promise<UserProfile | null> {
    if (useMongo) {
      const doc = await UserModel.findByIdAndUpdate(userId, { $set: patch }, { new: true }).lean();
      return doc ? toPublicUser(doc) : null;
    }
    const db = loadLocalDb();
    const idx = db.users.findIndex((u) => u.id === userId);
    if (idx === -1) return null;
    const nextLevel = patch.currentLevel || db.users[idx].currentLevel;
    db.users[idx] = {
      ...db.users[idx],
      ...patch,
      currentLevel: nextLevel,
      levelName: LEVEL_NAMES[nextLevel],
    };
    saveLocalDb(db);
    const { passwordHash: _omit, ...pub } = db.users[idx];
    return pub;
  },

  async applyAssessmentLevel(
    userId: string,
    level: LevelNumber,
    summary: string
  ): Promise<UserProfile | null> {
    const initialTasks = buildInitialTasksForLevel(level);
    if (useMongo) {
      await TaskProgressModel.deleteMany({ userId });
      await TaskProgressModel.insertMany(initialTasks.map((t) => ({ ...t, userId })));
      const doc = await UserModel.findByIdAndUpdate(
        userId,
        {
          $set: {
            currentLevel: level,
            assessmentCompleted: true,
            assessmentSummary: summary,
          },
        },
        { new: true }
      ).lean();
      return doc ? toPublicUser(doc) : null;
    }

    const db = loadLocalDb();
    db.taskProgress = db.taskProgress.filter((t) => t.userId !== userId);
    for (const t of initialTasks) {
      db.taskProgress.push({ ...t, userId });
    }
    const idx = db.users.findIndex((u) => u.id === userId);
    if (idx === -1) return null;
    db.users[idx] = {
      ...db.users[idx],
      currentLevel: level,
      levelName: LEVEL_NAMES[level],
      assessmentCompleted: true,
      assessmentSummary: summary,
    };
    saveLocalDb(db);
    const { passwordHash: _omit, ...pub } = db.users[idx];
    return pub;
  },

  async getTaskProgress(userId: string): Promise<TaskProgressRecord[]> {
    if (useMongo) {
      const docs = await TaskProgressModel.find({ userId }).lean();
      if (docs.length === 0) {
        const init = buildInitialTasksForLevel(1).map((t) => ({ ...t, userId }));
        await TaskProgressModel.insertMany(init);
        return init.map(({ userId: _u, ...rest }) => rest);
      }
      return docs.map((d: any) => ({
        taskId: d.taskId,
        levelNumber: d.levelNumber,
        status: d.status,
        turnsCompleted: d.turnsCompleted,
        attempts: d.attempts,
        bestAccuracy: d.bestAccuracy,
        lastPracticedAt: d.lastPracticedAt,
        completedAt: d.completedAt,
      }));
    }

    const db = loadLocalDb();
    let list = db.taskProgress.filter((t) => t.userId === userId);
    if (list.length === 0) {
      const init = buildInitialTasksForLevel(1).map((t) => ({ ...t, userId }));
      db.taskProgress.push(...init);
      saveLocalDb(db);
      list = init;
    }
    return list.map(({ userId: _u, ...rest }) => rest);
  },

  async recordTaskTurn(
    userId: string,
    taskId: string,
    turnCorrect: boolean,
    metRequirement: boolean
  ): Promise<{ unlockedNextTaskId: string | null; levelUpTo: LevelNumber | null }> {
    const allTasks = LEARNING_LEVELS.flatMap((l) => l.tasks);
    const targetDef = allTasks.find((t) => t.id === taskId);
    if (!targetDef) return { unlockedNextTaskId: null, levelUpTo: null };

    const now = new Date().toISOString();
    let unlockedNextTaskId: string | null = null;
    let levelUpTo: LevelNumber | null = null;

    const tasks = await this.getTaskProgress(userId);
    const current = tasks.find((t) => t.taskId === taskId);
    if (!current) return { unlockedNextTaskId: null, levelUpTo: null };

    const nextTurns = current.turnsCompleted + 1;
    const nextAttempts = current.attempts + 1;
    const approxAcc = Math.round(
      ((current.bestAccuracy * current.attempts + (turnCorrect ? 100 : 0)) / nextAttempts)
    );
    const shouldComplete =
      current.status === 'completed' || (nextTurns >= targetDef.requiredTurns && metRequirement);

    const nextStatus: 'locked' | 'unlocked' | 'completed' = shouldComplete
      ? 'completed'
      : current.status === 'locked'
      ? 'unlocked'
      : current.status;

    const updateFields = {
      turnsCompleted: nextTurns,
      attempts: nextAttempts,
      bestAccuracy: Math.max(current.bestAccuracy, approxAcc),
      lastPracticedAt: now,
      status: nextStatus,
      completedAt: shouldComplete ? current.completedAt || now : null,
    };

    if (useMongo) {
      await TaskProgressModel.updateOne({ userId, taskId }, { $set: updateFields });
    } else {
      const db = loadLocalDb();
      const idx = db.taskProgress.findIndex((t) => t.userId === userId && t.taskId === taskId);
      if (idx !== -1) {
        db.taskProgress[idx] = { ...db.taskProgress[idx], ...updateFields };
      }
      saveLocalDb(db);
    }

    if (shouldComplete && current.status !== 'completed') {
      const currentIdx = allTasks.findIndex((t) => t.id === taskId);
      const nextDef = allTasks[currentIdx + 1];
      if (nextDef) {
        unlockedNextTaskId = nextDef.id;
        if (useMongo) {
          await TaskProgressModel.updateOne(
            { userId, taskId: nextDef.id, status: 'locked' },
            { $set: { status: 'unlocked' } }
          );
        } else {
          const db = loadLocalDb();
          const nIdx = db.taskProgress.findIndex(
            (t) => t.userId === userId && t.taskId === nextDef.id && t.status === 'locked'
          );
          if (nIdx !== -1) {
            db.taskProgress[nIdx].status = 'unlocked';
            saveLocalDb(db);
          }
        }
        if (nextDef.levelNumber > targetDef.levelNumber) {
          levelUpTo = nextDef.levelNumber;
          await this.updateUser(userId, { currentLevel: nextDef.levelNumber });
        }
      }
    }

    return { unlockedNextTaskId, levelUpTo };
  },

  async resetTaskForRetry(userId: string, taskId: string): Promise<void> {
    if (useMongo) {
      await TaskProgressModel.updateOne(
        { userId, taskId },
        { $set: { turnsCompleted: 0, lastPracticedAt: new Date().toISOString() } }
      );
      return;
    }
    const db = loadLocalDb();
    const idx = db.taskProgress.findIndex((t) => t.userId === userId && t.taskId === taskId);
    if (idx !== -1) {
      db.taskProgress[idx].turnsCompleted = 0;
      db.taskProgress[idx].lastPracticedAt = new Date().toISOString();
      saveLocalDb(db);
    }
  },

  async logPracticeActivity(
    userId: string,
    speakingSeconds: number,
    isCorrectTurn: boolean
  ): Promise<UserProfile | null> {
    const today = todayISO();
    const yest = yesterdayISO();
    const secs = Math.max(5, Math.min(600, Math.round(speakingSeconds)));

    if (useMongo) {
      const user = await UserModel.findById(userId);
      if (!user) return null;
      let nextStreak = user.streakDays || 0;
      if (user.lastActiveDate !== today) {
        nextStreak = user.lastActiveDate === yest ? nextStreak + 1 : 1;
      }
      user.streakDays = nextStreak;
      user.lastActiveDate = today;
      user.totalSpeakingSeconds = (user.totalSpeakingSeconds || 0) + secs;
      user.totalTurns = (user.totalTurns || 0) + 1;
      user.correctTurns = (user.correctTurns || 0) + (isCorrectTurn ? 1 : 0);
      await user.save();

      await DailyActivityModel.findOneAndUpdate(
        { userId, date: today },
        {
          $inc: {
            speakingSeconds: secs,
            turns: 1,
            correctTurns: isCorrectTurn ? 1 : 0,
          },
        },
        { upsert: true, new: true }
      );
      return toPublicUser(user);
    }

    const db = loadLocalDb();
    const idx = db.users.findIndex((u) => u.id === userId);
    if (idx === -1) return null;
    const u = db.users[idx];
    let nextStreak = u.streakDays || 0;
    if (u.lastActiveDate !== today) {
      nextStreak = u.lastActiveDate === yest ? nextStreak + 1 : 1;
    }
    u.streakDays = nextStreak;
    u.lastActiveDate = today;
    u.totalSpeakingSeconds = (u.totalSpeakingSeconds || 0) + secs;
    u.totalTurns = (u.totalTurns || 0) + 1;
    u.correctTurns = (u.correctTurns || 0) + (isCorrectTurn ? 1 : 0);

    const dIdx = db.dailyLogs.findIndex((d) => d.userId === userId && d.date === today);
    if (dIdx === -1) {
      db.dailyLogs.push({
        userId,
        date: today,
        speakingSeconds: secs,
        turns: 1,
        correctTurns: isCorrectTurn ? 1 : 0,
      });
    } else {
      db.dailyLogs[dIdx].speakingSeconds += secs;
      db.dailyLogs[dIdx].turns += 1;
      db.dailyLogs[dIdx].correctTurns += isCorrectTurn ? 1 : 0;
    }

    saveLocalDb(db);
    const { passwordHash: _omit, ...pub } = u;
    return pub;
  },

  async saveMistake(input: {
    userId: string;
    category: GrammarCategory;
    severity: MistakeSeverity;
    originalSentence: string;
    correctedSentence: string;
    wrongSnippet: string;
    correctedSnippet: string;
    explanationMalayalam: string;
    ruleSummary: string;
  }): Promise<MistakeItem> {
    const now = new Date().toISOString();
    const normKey = `${input.category}:${input.wrongSnippet.trim().toLowerCase()}`;

    if (useMongo) {
      const existing = await MistakeRecordModel.findOne({
        userId: input.userId,
        category: input.category,
        wrongSnippet: new RegExp(`^${input.wrongSnippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      });
      if (existing) {
        existing.occurrences += 1;
        existing.lastSeenAt = now;
        existing.originalSentence = input.originalSentence;
        existing.correctedSentence = input.correctedSentence;
        existing.explanationMalayalam = input.explanationMalayalam;
        await existing.save();
        return {
          id: String(existing._id),
          userId: existing.userId,
          category: existing.category as GrammarCategory,
          severity: existing.severity as MistakeSeverity,
          originalSentence: existing.originalSentence,
          correctedSentence: existing.correctedSentence,
          wrongSnippet: existing.wrongSnippet,
          correctedSnippet: existing.correctedSnippet,
          explanationMalayalam: existing.explanationMalayalam,
          ruleSummary: existing.ruleSummary,
          occurrences: existing.occurrences,
          resolvedCount: existing.resolvedCount,
          lastSeenAt: existing.lastSeenAt,
          createdAt: existing.createdAt ? new Date(existing.createdAt).toISOString() : now,
        };
      }
      const created = await MistakeRecordModel.create({ ...input, occurrences: 1, resolvedCount: 0, lastSeenAt: now });
      return {
        id: String(created._id),
        ...input,
        occurrences: 1,
        resolvedCount: 0,
        lastSeenAt: now,
        createdAt: now,
      };
    }

    const db = loadLocalDb();
    const existing = db.mistakes.find(
      (m) => m.userId === input.userId && `${m.category}:${m.wrongSnippet.trim().toLowerCase()}` === normKey
    );
    if (existing) {
      existing.occurrences += 1;
      existing.lastSeenAt = now;
      existing.originalSentence = input.originalSentence;
      existing.correctedSentence = input.correctedSentence;
      existing.explanationMalayalam = input.explanationMalayalam;
      saveLocalDb(db);
      return existing;
    }
    const item: MistakeItem = {
      id: crypto.randomUUID(),
      ...input,
      occurrences: 1,
      resolvedCount: 0,
      lastSeenAt: now,
      createdAt: now,
    };
    db.mistakes.unshift(item);
    saveLocalDb(db);
    return item;
  },

  async getMistakes(userId: string): Promise<MistakeItem[]> {
    if (useMongo) {
      const docs = await MistakeRecordModel.find({ userId }).sort({ lastSeenAt: -1 }).lean();
      return docs.map((d: any) => ({
        id: String(d._id),
        userId: d.userId,
        category: d.category,
        severity: d.severity,
        originalSentence: d.originalSentence,
        correctedSentence: d.correctedSentence,
        wrongSnippet: d.wrongSnippet,
        correctedSnippet: d.correctedSnippet,
        explanationMalayalam: d.explanationMalayalam,
        ruleSummary: d.ruleSummary,
        occurrences: d.occurrences,
        resolvedCount: d.resolvedCount,
        lastSeenAt: d.lastSeenAt,
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : d.lastSeenAt,
      }));
    }
    const db = loadLocalDb();
    return db.mistakes
      .filter((m) => m.userId === userId)
      .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  },

  async markMistakeResolved(userId: string, mistakeId: string): Promise<MistakeItem | null> {
    if (useMongo) {
      const doc = await MistakeRecordModel.findOneAndUpdate(
        { _id: mistakeId, userId },
        { $inc: { resolvedCount: 1 } },
        { new: true }
      ).lean();
      if (!doc) return null;
      return {
        id: String((doc as any)._id),
        userId: (doc as any).userId,
        category: (doc as any).category,
        severity: (doc as any).severity,
        originalSentence: (doc as any).originalSentence,
        correctedSentence: (doc as any).correctedSentence,
        wrongSnippet: (doc as any).wrongSnippet,
        correctedSnippet: (doc as any).correctedSnippet,
        explanationMalayalam: (doc as any).explanationMalayalam,
        ruleSummary: (doc as any).ruleSummary,
        occurrences: (doc as any).occurrences,
        resolvedCount: (doc as any).resolvedCount,
        lastSeenAt: (doc as any).lastSeenAt,
        createdAt: (doc as any).createdAt ? new Date((doc as any).createdAt).toISOString() : (doc as any).lastSeenAt,
      };
    }
    const db = loadLocalDb();
    const item = db.mistakes.find((m) => m.id === mistakeId && m.userId === userId);
    if (!item) return null;
    item.resolvedCount += 1;
    saveLocalDb(db);
    return item;
  },

  async saveVocabulary(
    userId: string,
    entries: Array<{ word: string; meaningMalayalam: string; exampleSentence: string }>
  ): Promise<void> {
    if (!entries.length) return;
    const now = new Date().toISOString();
    if (useMongo) {
      for (const e of entries) {
        const cleanWord = e.word.trim().toLowerCase();
        if (!cleanWord) continue;
        await VocabularyModel.findOneAndUpdate(
          { userId, word: cleanWord },
          {
            $setOnInsert: {
              userId,
              word: cleanWord,
              meaningMalayalam: e.meaningMalayalam,
              exampleSentence: e.exampleSentence,
              mastered: false,
              learnedAt: now,
            },
          },
          { upsert: true }
        );
      }
      return;
    }

    const db = loadLocalDb();
    for (const e of entries) {
      const cleanWord = e.word.trim().toLowerCase();
      if (!cleanWord) continue;
      const exists = db.vocabulary.some(
        (v) => v.userId === userId && v.word.toLowerCase() === cleanWord
      );
      if (!exists) {
        db.vocabulary.unshift({
          id: crypto.randomUUID(),
          userId,
          word: cleanWord,
          meaningMalayalam: e.meaningMalayalam,
          exampleSentence: e.exampleSentence,
          mastered: false,
          learnedAt: now,
        });
      }
    }
    saveLocalDb(db);
  },

  async getVocabulary(userId: string): Promise<VocabularyEntry[]> {
    if (useMongo) {
      const docs = await VocabularyModel.find({ userId }).sort({ learnedAt: -1 }).lean();
      return docs.map((d: any) => ({
        id: String(d._id),
        word: d.word,
        meaningMalayalam: d.meaningMalayalam,
        exampleSentence: d.exampleSentence,
        mastered: d.mastered,
        learnedAt: d.learnedAt,
      }));
    }
    const db = loadLocalDb();
    return db.vocabulary
      .filter((v) => v.userId === userId)
      .map(({ userId: _u, ...rest }) => rest)
      .sort((a, b) => b.learnedAt.localeCompare(a.learnedAt));
  },

  async toggleVocabularyMastered(userId: string, vocabId: string): Promise<VocabularyEntry | null> {
    if (useMongo) {
      const doc = await VocabularyModel.findOne({ _id: vocabId, userId });
      if (!doc) return null;
      doc.mastered = !doc.mastered;
      await doc.save();
      return {
        id: String(doc._id),
        word: doc.word,
        meaningMalayalam: doc.meaningMalayalam,
        exampleSentence: doc.exampleSentence,
        mastered: doc.mastered,
        learnedAt: doc.learnedAt,
      };
    }
    const db = loadLocalDb();
    const item = db.vocabulary.find((v) => v.id === vocabId && v.userId === userId);
    if (!item) return null;
    item.mastered = !item.mastered;
    saveLocalDb(db);
    const { userId: _u, ...rest } = item;
    return rest;
  },

  async createSession(input: {
    userId: string;
    title: string;
    mode: string;
    taskId?: string | null;
    activitySlug?: string | null;
    pictureSceneId?: string | null;
    initialMessages: ChatMessage[];
  }): Promise<StoredSession> {
    const now = new Date().toISOString();
    if (useMongo) {
      const doc = await ConversationSessionModel.create({
        userId: input.userId,
        title: input.title,
        mode: input.mode,
        taskId: input.taskId || null,
        activitySlug: input.activitySlug || null,
        pictureSceneId: input.pictureSceneId || null,
        messages: input.initialMessages,
        turns: 0,
        correctTurns: 0,
        speakingSeconds: 0,
      });
      return {
        id: String(doc._id),
        userId: doc.userId,
        title: doc.title,
        mode: doc.mode,
        taskId: doc.taskId,
        activitySlug: doc.activitySlug,
        pictureSceneId: doc.pictureSceneId,
        messages: (doc.messages || []) as ChatMessage[],
        turns: doc.turns,
        correctTurns: doc.correctTurns,
        speakingSeconds: doc.speakingSeconds,
        createdAt: now,
        updatedAt: now,
      };
    }

    const db = loadLocalDb();
    const session: StoredSession = {
      id: crypto.randomUUID(),
      userId: input.userId,
      title: input.title,
      mode: input.mode,
      taskId: input.taskId || null,
      activitySlug: input.activitySlug || null,
      pictureSceneId: input.pictureSceneId || null,
      messages: input.initialMessages,
      turns: 0,
      correctTurns: 0,
      speakingSeconds: 0,
      createdAt: now,
      updatedAt: now,
    };
    db.sessions.unshift(session);
    saveLocalDb(db);
    return session;
  },

  async getSession(userId: string, sessionId: string): Promise<StoredSession | null> {
    if (useMongo) {
      const doc = await ConversationSessionModel.findOne({ _id: sessionId, userId }).lean();
      if (!doc) return null;
      return {
        id: String((doc as any)._id),
        userId: (doc as any).userId,
        title: (doc as any).title,
        mode: (doc as any).mode,
        taskId: (doc as any).taskId || null,
        activitySlug: (doc as any).activitySlug || null,
        pictureSceneId: (doc as any).pictureSceneId || null,
        messages: ((doc as any).messages || []) as ChatMessage[],
        turns: (doc as any).turns || 0,
        correctTurns: (doc as any).correctTurns || 0,
        speakingSeconds: (doc as any).speakingSeconds || 0,
        createdAt: (doc as any).createdAt ? new Date((doc as any).createdAt).toISOString() : new Date().toISOString(),
        updatedAt: (doc as any).updatedAt ? new Date((doc as any).updatedAt).toISOString() : new Date().toISOString(),
      };
    }
    const db = loadLocalDb();
    return db.sessions.find((s) => s.id === sessionId && s.userId === userId) || null;
  },

  async listSessions(userId: string): Promise<StoredSession[]> {
    if (useMongo) {
      const docs = await ConversationSessionModel.find({ userId }).sort({ updatedAt: -1 }).limit(30).lean();
      return docs.map((d: any) => ({
        id: String(d._id),
        userId: d.userId,
        title: d.title,
        mode: d.mode,
        taskId: d.taskId || null,
        activitySlug: d.activitySlug || null,
        pictureSceneId: d.pictureSceneId || null,
        messages: (d.messages || []) as ChatMessage[],
        turns: d.turns || 0,
        correctTurns: d.correctTurns || 0,
        speakingSeconds: d.speakingSeconds || 0,
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : new Date().toISOString(),
      }));
    }
    const db = loadLocalDb();
    return db.sessions
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 30);
  },

  async appendSessionMessages(
    userId: string,
    sessionId: string,
    newMessages: ChatMessage[],
    speakingSeconds: number,
    isCorrectTurn: boolean
  ): Promise<StoredSession | null> {
    const now = new Date().toISOString();
    if (useMongo) {
      const doc = await ConversationSessionModel.findOneAndUpdate(
        { _id: sessionId, userId },
        {
          $push: { messages: { $each: newMessages } },
          $inc: {
            turns: 1,
            correctTurns: isCorrectTurn ? 1 : 0,
            speakingSeconds: Math.round(speakingSeconds),
          },
        },
        { new: true }
      ).lean();
      if (!doc) return null;
      return {
        id: String((doc as any)._id),
        userId: (doc as any).userId,
        title: (doc as any).title,
        mode: (doc as any).mode,
        taskId: (doc as any).taskId || null,
        activitySlug: (doc as any).activitySlug || null,
        pictureSceneId: (doc as any).pictureSceneId || null,
        messages: ((doc as any).messages || []) as ChatMessage[],
        turns: (doc as any).turns,
        correctTurns: (doc as any).correctTurns,
        speakingSeconds: (doc as any).speakingSeconds,
        createdAt: (doc as any).createdAt ? new Date((doc as any).createdAt).toISOString() : now,
        updatedAt: now,
      };
    }
    const db = loadLocalDb();
    const s = db.sessions.find((item) => item.id === sessionId && item.userId === userId);
    if (!s) return null;
    s.messages.push(...newMessages);
    s.turns += 1;
    s.correctTurns += isCorrectTurn ? 1 : 0;
    s.speakingSeconds += Math.round(speakingSeconds);
    s.updatedAt = now;
    saveLocalDb(db);
    return s;
  },

  async markRepeatCompleted(userId: string, sessionId: string, messageId: string): Promise<void> {
    if (useMongo) {
      await ConversationSessionModel.updateOne(
        { _id: sessionId, userId, 'messages.id': messageId },
        { $set: { 'messages.$.repeatCompleted': true } }
      );
      return;
    }
    const db = loadLocalDb();
    const s = db.sessions.find((item) => item.id === sessionId && item.userId === userId);
    if (!s) return;
    const msg = s.messages.find((m) => m.id === messageId);
    if (msg) {
      msg.repeatCompleted = true;
      saveLocalDb(db);
    }
  },

  async getDailyLogs(userId: string): Promise<StoredDailyLog[]> {
    if (useMongo) {
      const docs = await DailyActivityModel.find({ userId }).sort({ date: -1 }).limit(30).lean();
      return docs.map((d: any) => ({
        userId: d.userId,
        date: d.date,
        speakingSeconds: d.speakingSeconds || 0,
        turns: d.turns || 0,
        correctTurns: d.correctTurns || 0,
      }));
    }
    const db = loadLocalDb();
    return db.dailyLogs.filter((d) => d.userId === userId);
  },
};
