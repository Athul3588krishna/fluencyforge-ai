import mongoose, { Schema } from 'mongoose';

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    currentLevel: { type: Number, default: 1, min: 1, max: 6 },
    assessmentCompleted: { type: Boolean, default: false },
    assessmentSummary: { type: String, default: '' },
    dailyGoalMinutes: { type: Number, default: 15 },
    streakDays: { type: Number, default: 0 },
    lastActiveDate: { type: String, default: null },
    totalSpeakingSeconds: { type: Number, default: 0 },
    totalTurns: { type: Number, default: 0 },
    correctTurns: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const TaskProgressSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    taskId: { type: String, required: true },
    levelNumber: { type: Number, required: true },
    status: { type: String, enum: ['locked', 'unlocked', 'completed'], default: 'locked' },
    turnsCompleted: { type: Number, default: 0 },
    attempts: { type: Number, default: 0 },
    bestAccuracy: { type: Number, default: 0 },
    lastPracticedAt: { type: String, default: null },
    completedAt: { type: String, default: null },
  },
  { timestamps: true }
);
TaskProgressSchema.index({ userId: 1, taskId: 1 }, { unique: true });

const MistakeRecordSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    category: { type: String, required: true },
    severity: { type: String, enum: ['genuine_error', 'optional_improvement'], default: 'genuine_error' },
    originalSentence: { type: String, required: true },
    correctedSentence: { type: String, required: true },
    wrongSnippet: { type: String, required: true },
    correctedSnippet: { type: String, required: true },
    explanationMalayalam: { type: String, required: true },
    ruleSummary: { type: String, required: true },
    occurrences: { type: Number, default: 1 },
    resolvedCount: { type: Number, default: 0 },
    lastSeenAt: { type: String, required: true },
  },
  { timestamps: true }
);

const ChatMessageSubSchema = new Schema(
  {
    id: String,
    role: { type: String, enum: ['user', 'assistant'] },
    content: String,
    timestamp: String,
    inputMode: String,
    speakingSeconds: Number,
    isGrammaticallyCorrect: Boolean,
    hasGenuineErrors: Boolean,
    correction: Schema.Types.Mixed,
    followUpQuestion: String,
    repeatRequired: Boolean,
    repeatCompleted: Boolean,
  },
  { _id: false }
);

const ConversationSessionSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    mode: { type: String, required: true },
    taskId: { type: String, default: null },
    activitySlug: { type: String, default: null },
    pictureSceneId: { type: String, default: null },
    messages: [ChatMessageSubSchema],
    turns: { type: Number, default: 0 },
    correctTurns: { type: Number, default: 0 },
    speakingSeconds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const VocabularySchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    word: { type: String, required: true },
    meaningMalayalam: { type: String, required: true },
    exampleSentence: { type: String, required: true },
    mastered: { type: Boolean, default: false },
    learnedAt: { type: String, required: true },
  },
  { timestamps: true }
);
VocabularySchema.index({ userId: 1, word: 1 }, { unique: true });

const DailyActivitySchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true },
    speakingSeconds: { type: Number, default: 0 },
    turns: { type: Number, default: 0 },
    correctTurns: { type: Number, default: 0 },
  },
  { timestamps: true }
);
DailyActivitySchema.index({ userId: 1, date: 1 }, { unique: true });

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
export const TaskProgressModel =
  mongoose.models.TaskProgress || mongoose.model('TaskProgress', TaskProgressSchema);
export const MistakeRecordModel =
  mongoose.models.MistakeRecord || mongoose.model('MistakeRecord', MistakeRecordSchema);
export const ConversationSessionModel =
  mongoose.models.ConversationSession ||
  mongoose.model('ConversationSession', ConversationSessionSchema);
export const VocabularyModel =
  mongoose.models.Vocabulary || mongoose.model('Vocabulary', VocabularySchema);
export const DailyActivityModel =
  mongoose.models.DailyActivity || mongoose.model('DailyActivity', DailyActivitySchema);
