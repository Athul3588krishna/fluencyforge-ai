import { GoogleGenAI, Type } from '@google/genai';
import { LEVEL_NAMES } from '../../src/data/curriculum';
import type {
  ChatMessage,
  CorrectionDetail,
  DetectedMistake,
  GrammarCategory,
  LevelNumber,
  MistakeItem,
  RevisionDrill,
} from '../../src/types/fluency';

const MODEL_NAME = 'gemini-4-hydrogen';

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface TutorTurnResult {
  teacherReply: string;
  followUpQuestion: string;
  isGrammaticallyCorrect: boolean;
  hasGenuineErrors: boolean;
  correction: CorrectionDetail | null;
  newVocabulary: Array<{
    word: string;
    meaningMalayalam: string;
    exampleSentence: string;
  }>;
  taskEvaluation: {
    metRequirement: boolean;
    feedback: string;
  };
}

const VALID_CATEGORIES: GrammarCategory[] = [
  'Tenses',
  'Articles',
  'Prepositions',
  'Subject-Verb Agreement',
  'Sentence Structure',
  'Vocabulary',
  'Word Order',
];

function normalizeCategory(raw: string): GrammarCategory {
  const found = VALID_CATEGORIES.find((c) => c.toLowerCase() === String(raw || '').toLowerCase());
  if (found) return found;
  const lower = String(raw || '').toLowerCase();
  if (lower.includes('tense')) return 'Tenses';
  if (lower.includes('article')) return 'Articles';
  if (lower.includes('prep')) return 'Prepositions';
  if (lower.includes('subject') || lower.includes('agree')) return 'Subject-Verb Agreement';
  if (lower.includes('word')) return 'Word Order';
  if (lower.includes('vocab')) return 'Vocabulary';
  return 'Sentence Structure';
}

export async function analyzeTurnWithTutor(params: {
  userLevel: LevelNumber;
  userName: string;
  learnerText: string;
  history: ChatMessage[];
  modeLabel: string;
  taskContext?: string;
  weakAreas: string[];
}): Promise<TutorTurnResult> {
  const ai = getClient();

  const recentHistory = params.history
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'Learner' : 'Teacher'}: ${m.content}`)
    .join('\n');

  const systemInstruction = `You are FluencyForge AI, a warm, encouraging, yet strict personal English communication teacher for Malayalam-speaking learners.

CORE TEACHING RULES (NON-NEGOTIABLE):
1. Identify EVERY genuine grammar, tense, article, preposition, subject-verb agreement, sentence structure, vocabulary, or word order mistake in the learner's latest English message.
2. NEVER falsely praise incorrect grammar (do not say "Great grammar!" or "Perfect sentence!" when genuine mistakes exist). Be encouraging about their effort ("Good attempt!" / "Nice effort!"), then clearly correct the mistake.
3. Distinguish between:
   - "genuine_error": An actual grammatical/vocabulary error that must be corrected.
   - "optional_improvement": The sentence is already grammatically valid, and you are offering a smoother or more natural phrasing.
4. Explain every mistake in simple, crystal-clear Malayalam (മലയാളം script, easy everyday spoken-style Malayalam mixed with clear English grammar terms like past tense, article, preposition).
   Example Malayalam style: "Yesterday എന്നത് കഴിഞ്ഞ ദിവസത്തെ സൂചിപ്പിക്കുന്നു. അതിനാൽ past tense ഉപയോഗിക്കണം. Go എന്നതിന്റെ past form Went ആണ്."
5. Provide the complete corrected English sentence, 1–2 natural English alternatives, and 2 additional example sentences using the same rule.
6. If there are genuine errors, set repeatPrompt to ask the learner to repeat the corrected sentence cleanly.
7. Ask ONLY ONE clear, level-appropriate follow-up question in followUpQuestion (never ask two questions at once).
8. Keep teacherReply concise (2–4 sentences), friendly, and end cleanly without repeating the entire correction table inside teacherReply.
9. Evaluate taskEvaluation.metRequirement honestly: true only if the learner gave a meaningful on-topic response (at least 4 words, relevant to the prompt/context).

Learner Profile:
- Name: ${params.userName}
- Current Level: Level ${params.userLevel} (${LEVEL_NAMES[params.userLevel]})
- Practice Mode: ${params.modeLabel}
- Known Weak Areas from Mistake Memory: ${params.weakAreas.length > 0 ? params.weakAreas.join(', ') : 'None logged yet'}
${params.taskContext ? `- Activity / Task Context: ${params.taskContext}` : ''}`;

  const prompt = `Conversation so far:
${recentHistory || '(Session just started)'}

Learner's latest response:
"${params.learnerText}"

Analyze the learner's latest response carefully and return strict JSON.`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          teacherReply: {
            type: Type.STRING,
            description:
              'Friendly conversational reaction to the content of the user message, encouraging effort without falsely praising bad grammar, leading into ONE follow-up question.',
          },
          followUpQuestion: {
            type: Type.STRING,
            description: 'Exactly ONE clear next question for the learner to answer.',
          },
          hasGenuineErrors: {
            type: Type.BOOLEAN,
            description: 'True if the learner sentence has at least one genuine grammar or vocabulary error.',
          },
          isGrammaticallyCorrect: {
            type: Type.BOOLEAN,
            description: 'True ONLY if there are zero genuine grammar or vocabulary errors.',
          },
          correctedSentence: {
            type: Type.STRING,
            description: 'The clean, grammatically accurate version of the learner sentence.',
          },
          malayalamExplanation: {
            type: Type.STRING,
            description:
              'Clear summary explanation in simple Malayalam explaining why the mistakes happened or confirming why the sentence is correct.',
          },
          naturalAlternatives: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '1 to 2 natural ways a fluent speaker might express the same idea.',
          },
          additionalExamples: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '2 practical additional English example sentences demonstrating the rule.',
          },
          repeatPrompt: {
            type: Type.STRING,
            description: 'Instruction asking the learner to repeat the corrected sentence if errors were found.',
          },
          mistakes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: {
                  type: Type.STRING,
                  description:
                    'One of: Tenses, Articles, Prepositions, Subject-Verb Agreement, Sentence Structure, Vocabulary, Word Order',
                },
                wrongSnippet: { type: Type.STRING },
                correctedSnippet: { type: Type.STRING },
                severity: {
                  type: Type.STRING,
                  description: 'Either genuine_error or optional_improvement',
                },
                explanationMalayalam: {
                  type: Type.STRING,
                  description: 'Specific Malayalam explanation for this exact mistake.',
                },
                ruleSummary: {
                  type: Type.STRING,
                  description: 'Short 1-line English grammar rule.',
                },
              },
              required: [
                'category',
                'wrongSnippet',
                'correctedSnippet',
                'severity',
                'explanationMalayalam',
                'ruleSummary',
              ],
            },
          },
          newVocabulary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                meaningMalayalam: { type: Type.STRING },
                exampleSentence: { type: Type.STRING },
              },
              required: ['word', 'meaningMalayalam', 'exampleSentence'],
            },
          },
          taskMetRequirement: { type: Type.BOOLEAN },
          taskFeedback: { type: Type.STRING },
        },
        required: [
          'teacherReply',
          'followUpQuestion',
          'hasGenuineErrors',
          'isGrammaticallyCorrect',
          'correctedSentence',
          'malayalamExplanation',
          'naturalAlternatives',
          'additionalExamples',
          'repeatPrompt',
          'mistakes',
          'newVocabulary',
          'taskMetRequirement',
          'taskFeedback',
        ],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim());

  const mistakes: DetectedMistake[] = Array.isArray(parsed.mistakes)
    ? parsed.mistakes.map((m: any) => ({
        category: normalizeCategory(m.category),
        wrongSnippet: String(m.wrongSnippet || ''),
        correctedSnippet: String(m.correctedSnippet || ''),
        severity: m.severity === 'optional_improvement' ? 'optional_improvement' : 'genuine_error',
        explanationMalayalam: String(m.explanationMalayalam || ''),
        ruleSummary: String(m.ruleSummary || ''),
      }))
    : [];

  const hasGenuineErrors =
    Boolean(parsed.hasGenuineErrors) || mistakes.some((m) => m.severity === 'genuine_error');

  const correction: CorrectionDetail = {
    originalSentence: params.learnerText,
    correctedSentence: String(parsed.correctedSentence || params.learnerText),
    malayalamExplanation: String(parsed.malayalamExplanation || ''),
    naturalAlternatives: Array.isArray(parsed.naturalAlternatives)
      ? parsed.naturalAlternatives.map(String).slice(0, 3)
      : [],
    additionalExamples: Array.isArray(parsed.additionalExamples)
      ? parsed.additionalExamples.map(String).slice(0, 3)
      : [],
    repeatPrompt: hasGenuineErrors
      ? String(
          parsed.repeatPrompt ||
            `Please repeat this corrected sentence aloud or type it: "${parsed.correctedSentence}"`
        )
      : '',
    mistakes,
  };

  return {
    teacherReply: String(parsed.teacherReply || ''),
    followUpQuestion: String(parsed.followUpQuestion || ''),
    isGrammaticallyCorrect: !hasGenuineErrors && Boolean(parsed.isGrammaticallyCorrect),
    hasGenuineErrors,
    correction,
    newVocabulary: Array.isArray(parsed.newVocabulary)
      ? parsed.newVocabulary
          .slice(0, 2)
          .map((v: any) => ({
            word: String(v.word || '').trim(),
            meaningMalayalam: String(v.meaningMalayalam || '').trim(),
            exampleSentence: String(v.exampleSentence || '').trim(),
          }))
          .filter((v: any) => v.word && v.meaningMalayalam)
      : [],
    taskEvaluation: {
      metRequirement: Boolean(parsed.taskMetRequirement),
      feedback: String(parsed.taskFeedback || ''),
    },
  };
}

export async function evaluateInitialAssessment(answers: {
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  q5: string;
}): Promise<{
  recommendedLevel: LevelNumber;
  summary: string;
  malayalamFeedback: string;
  detectedWeakAreas: GrammarCategory[];
}> {
  const ai = getClient();

  const prompt = `Evaluate this English proficiency placement assessment for a Malayalam-speaking learner.

Question 1 (Choose correct past tense): "${answers.q1}"
(Correct option is "Yesterday I went to college.")

Question 2 (Choose correct present habit): "${answers.q2}"
(Correct option is "She goes to the office at 9 AM.")

Question 3 (Choose correct articles & prepositions): "${answers.q3}"
(Correct option is "I bought an umbrella and put it on the table.")

Question 4 (Open intro & yesterday event): "${answers.q4}"
Question 5 (Open goal & reason): "${answers.q5}"

Assign a starting level from 1 to 6:
1 = Beginner English
2 = Grammar Foundation
3 = Daily Communication
4 = Speaking Confidence
5 = Professional English
6 = Advanced Fluency

Be realistic and strict about genuine grammar mistakes in Q4 and Q5.`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      systemInstruction:
        'You are an English placement examiner. Evaluate grammar accuracy, tense control, sentence complexity, and vocabulary. Provide encouraging yet honest feedback in English and simple Malayalam.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          recommendedLevel: { type: Type.INTEGER },
          summary: { type: Type.STRING },
          malayalamFeedback: { type: Type.STRING },
          detectedWeakAreas: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['recommendedLevel', 'summary', 'malayalamFeedback', 'detectedWeakAreas'],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim());
  const rawLevel = Number(parsed.recommendedLevel) || 1;
  const recommendedLevel = Math.min(6, Math.max(1, Math.round(rawLevel))) as LevelNumber;

  return {
    recommendedLevel,
    summary: String(
      parsed.summary ||
        `Placed at Level ${recommendedLevel} (${LEVEL_NAMES[recommendedLevel]}) based on your grammar accuracy and sentence fluency.`
    ),
    malayalamFeedback: String(parsed.malayalamFeedback || ''),
    detectedWeakAreas: Array.isArray(parsed.detectedWeakAreas)
      ? parsed.detectedWeakAreas.map(normalizeCategory)
      : ['Tenses'],
  };
}

export async function generateRevisionDrill(
  userLevel: LevelNumber,
  mistakes: MistakeItem[]
): Promise<RevisionDrill> {
  const ai = getClient();

  const mistakeSummary = mistakes
    .slice(0, 10)
    .map(
      (m) =>
        `- Category: ${m.category} | Occurrences: ${m.occurrences} | Wrong: "${m.originalSentence}" -> Correct: "${m.correctedSentence}"`
    )
    .join('\n');

  const prompt = `Create a personalized 3-item English revision drill for a Level ${userLevel} (${LEVEL_NAMES[userLevel]}) learner based on their Mistake Memory:

${mistakeSummary || 'No logged mistakes yet—generate foundational tense, article, and preposition drills.'}

Each drill item must present a realistic broken sentence (similar to their weak pattern), a clear prompt asking them to fix and say it, a short Malayalam hint, and the target corrected English sentence.`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      systemInstruction:
        'You are FluencyForge AI designing targeted grammar revision exercises with simple Malayalam hints.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          focusSummary: { type: Type.STRING },
          focusMalayalam: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                category: { type: Type.STRING },
                brokenSentence: { type: Type.STRING },
                promptQuestion: { type: Type.STRING },
                hintMalayalam: { type: Type.STRING },
                targetAnswer: { type: Type.STRING },
              },
              required: [
                'id',
                'category',
                'brokenSentence',
                'promptQuestion',
                'hintMalayalam',
                'targetAnswer',
              ],
            },
          },
        },
        required: ['focusSummary', 'focusMalayalam', 'items'],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim());
  return {
    focusSummary: String(parsed.focusSummary || 'Targeted Grammar Revision'),
    focusMalayalam: String(parsed.focusMalayalam || ''),
    items: Array.isArray(parsed.items)
      ? parsed.items.slice(0, 4).map((item: any, idx: number) => ({
          id: String(item.id || `rev-${idx + 1}`),
          category: normalizeCategory(item.category),
          brokenSentence: String(item.brokenSentence || ''),
          promptQuestion: String(item.promptQuestion || ''),
          hintMalayalam: String(item.hintMalayalam || ''),
          targetAnswer: String(item.targetAnswer || ''),
        }))
      : [],
  };
}
