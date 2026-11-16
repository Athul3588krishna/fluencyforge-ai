import type { LearningLevel, LevelNumber, PictureScene, PracticeActivity } from '../types/fluency';

export const LEVEL_NAMES: Record<LevelNumber, string> = {
  1: 'Beginner English',
  2: 'Grammar Foundation',
  3: 'Daily Communication',
  4: 'Speaking Confidence',
  5: 'Professional English',
  6: 'Advanced Fluency',
};

export const LEARNING_LEVELS: LearningLevel[] = [
  {
    levelNumber: 1,
    name: 'Beginner English',
    subtitle: 'Essential sentences, introductions, and simple present tense',
    description:
      'Build comfort forming clear, everyday English sentences about yourself, your family, and your immediate surroundings.',
    tasks: [
      {
        id: 'l1-t1',
        levelNumber: 1,
        order: 1,
        title: 'Introduce Yourself Clearly',
        description: 'Share your name, hometown, and what you currently study or do for work.',
        grammarFocus: 'Subject-Verb Agreement',
        requiredTurns: 3,
        starterPrompt:
          "Hello! Welcome to FluencyForge. Let's start with something simple. Tell me your name, where you live, and what you do every day.",
        successCriteria: 'Complete 3 conversational turns with proper "am / is / are" and simple present verbs.',
      },
      {
        id: 'l1-t2',
        levelNumber: 1,
        order: 2,
        title: 'Talk About Your Family & Home',
        description: 'Describe people in your family and objects around your home using correct articles.',
        grammarFocus: 'Articles',
        requiredTurns: 3,
        starterPrompt:
          'Nice! Now tell me about your family or the place where you live. For example, how many people are in your family?',
        successCriteria: 'Use "a", "an", "the", and "have / has" accurately across 3 responses.',
      },
      {
        id: 'l1-t3',
        levelNumber: 1,
        order: 3,
        title: 'Likes, Hobbies & Free Time',
        description: 'Explain what you enjoy doing in your free time with clear word order.',
        grammarFocus: 'Word Order',
        requiredTurns: 3,
        starterPrompt:
          'What do you like to do in your free time or on weekends? Try answering in two full English sentences.',
        successCriteria: 'Form natural hobby statements in 3 turns without missing subjects or objects.',
      },
      {
        id: 'l1-t4',
        levelNumber: 1,
        order: 4,
        title: 'Basic Daily Schedule',
        description: 'Describe your morning routine from waking up to leaving home.',
        grammarFocus: 'Tenses',
        requiredTurns: 3,
        starterPrompt:
          'Tell me about your typical morning. What time do you wake up, and what is the first thing you do?',
        successCriteria: 'Describe daily habits consistently in present simple across 3 turns.',
      },
    ],
  },
  {
    levelNumber: 2,
    name: 'Grammar Foundation',
    subtitle: 'Past & future tenses, prepositions, and sentence accuracy',
    description:
      'Eliminate common tense slips, preposition mix-ups, and subject-verb mismatches in everyday speech.',
    tasks: [
      {
        id: 'l2-t1',
        levelNumber: 2,
        order: 1,
        title: 'Yesterday & Past Experiences',
        description: 'Speak accurately about events that already happened using past tense verbs.',
        grammarFocus: 'Tenses',
        requiredTurns: 3,
        starterPrompt:
          'Think about yesterday. What did you do yesterday evening after finishing your work or classes?',
        successCriteria: 'Consistently use past tense verbs (went, ate, studied, met) across 3 turns.',
      },
      {
        id: 'l2-t2',
        levelNumber: 2,
        order: 2,
        title: 'Time & Place Prepositions',
        description: 'Master in, on, at, to, and from when describing appointments and locations.',
        grammarFocus: 'Prepositions',
        requiredTurns: 3,
        starterPrompt:
          'When and where do you usually meet your friends or go for tea? Use time and place details.',
        successCriteria: 'Apply "at", "on", "in", and "to" correctly across 3 turns.',
      },
      {
        id: 'l2-t3',
        levelNumber: 2,
        order: 3,
        title: 'Future Plans & Intentions',
        description: 'Use "will" and "going to" naturally to discuss upcoming plans.',
        grammarFocus: 'Sentence Structure',
        requiredTurns: 3,
        starterPrompt:
          'What are your plans for next weekend or next month? Tell me one thing you are planning to do.',
        successCriteria: 'Express future plans clearly using "going to" or "will" in 3 turns.',
      },
      {
        id: 'l2-t4',
        levelNumber: 2,
        order: 4,
        title: 'Subject-Verb Precision',
        description: 'Connect singular/plural subjects with matching verbs in longer sentences.',
        grammarFocus: 'Subject-Verb Agreement',
        requiredTurns: 3,
        starterPrompt:
          'Tell me about a friend or colleague who inspires you. What does that person do well?',
        successCriteria: 'Use third-person singular verbs (-s/-es) and "does/doesn\'t" accurately.',
      },
    ],
  },
  {
    levelNumber: 3,
    name: 'Daily Communication',
    subtitle: 'Practical real-world conversations and polite requests',
    description:
      'Handle everyday interactions smoothly—shopping, travel, dining, phone calls, and asking for help.',
    tasks: [
      {
        id: 'l3-t1',
        levelNumber: 3,
        order: 1,
        title: 'At a Café or Restaurant',
        description: 'Order food politely, ask about ingredients, and handle a billing question.',
        grammarFocus: 'Vocabulary',
        requiredTurns: 3,
        starterPrompt:
          "Imagine I am the server at a busy café. Good afternoon! What would you like to order today?",
        successCriteria: 'Complete a polite order and follow-up request across 3 turns.',
      },
      {
        id: 'l3-t2',
        levelNumber: 3,
        order: 2,
        title: 'Asking & Giving Directions',
        description: 'Ask clearly how to reach a landmark and describe routes.',
        grammarFocus: 'Prepositions',
        requiredTurns: 3,
        starterPrompt:
          'You just stepped out of a railway station in a new city and want to find the nearest bus stand. Ask me for directions!',
        successCriteria: 'Use clear question structure and spatial prepositions across 3 turns.',
      },
      {
        id: 'l3-t3',
        levelNumber: 3,
        order: 3,
        title: 'Making an Appointment by Phone',
        description: 'Book, reschedule, or confirm a clinic or service appointment.',
        grammarFocus: 'Sentence Structure',
        requiredTurns: 3,
        starterPrompt:
          "Hello, City Care Dental Clinic speaking. How can I help you today?",
        successCriteria: 'State your purpose, preferred date/time, and confirm politely in 3 turns.',
      },
      {
        id: 'l3-t4',
        levelNumber: 3,
        order: 4,
        title: 'Shopping & Comparing Options',
        description: 'Ask about price, quality, and compare two products naturally.',
        grammarFocus: 'Vocabulary',
        requiredTurns: 3,
        starterPrompt:
          'Welcome to our electronics store! Are you looking for headphones or a laptop today? Tell me what features matter to you.',
        successCriteria: 'Use comparative language and clear product questions in 3 turns.',
      },
    ],
  },
  {
    levelNumber: 4,
    name: 'Speaking Confidence',
    subtitle: 'Storytelling, opinions, and connected multi-sentence answers',
    description:
      'Move beyond short phrases by linking ideas with transitions, telling stories clearly, and explaining reasons.',
    tasks: [
      {
        id: 'l4-t1',
        levelNumber: 4,
        order: 1,
        title: 'Narrate a Memorable Trip',
        description: 'Tell a cohesive story with a beginning, middle, and ending.',
        grammarFocus: 'Tenses',
        requiredTurns: 4,
        starterPrompt:
          'Tell me about a trip or outing you really enjoyed. Where did you go, and what made it memorable?',
        successCriteria: 'Sustain past-tense narration with time connectors over 4 turns.',
      },
      {
        id: 'l4-t2',
        levelNumber: 4,
        order: 2,
        title: 'Explain a Process Step by Step',
        description: 'Explain how to cook a dish or complete a task using sequence words.',
        grammarFocus: 'Word Order',
        requiredTurns: 3,
        starterPrompt:
          'Teach me how to prepare your favorite snack or tea, step by step. Start with the ingredients you need.',
        successCriteria: 'Use clear sequence markers (first, then, after that, finally).',
      },
      {
        id: 'l4-t3',
        levelNumber: 4,
        order: 3,
        title: 'Expressing & Defending Opinions',
        description: 'Share your viewpoint with clear reasons and examples.',
        grammarFocus: 'Sentence Structure',
        requiredTurns: 4,
        starterPrompt:
          'Do you think working from home is better than working from an office? Share your opinion and one reason why.',
        successCriteria: 'Give structured opinions supported by "because", "although", or examples.',
      },
      {
        id: 'l4-t4',
        levelNumber: 4,
        order: 4,
        title: 'Handling Unexpected Problems',
        description: 'Explain a problem calmly (delayed parcel, missed train) and propose a solution.',
        grammarFocus: 'Vocabulary',
        requiredTurns: 3,
        starterPrompt:
          'Suppose your online order arrived damaged right before a family event. Call customer support—I am the agent. What do you say?',
        successCriteria: 'Explain the issue clearly and negotiate a resolution politely.',
      },
    ],
  },
  {
    levelNumber: 5,
    name: 'Professional English',
    subtitle: 'Workplace meetings, job interviews, and formal clarity',
    description:
      'Communicate persuasively and professionally in interviews, standups, client calls, and team discussions.',
    tasks: [
      {
        id: 'l5-t1',
        levelNumber: 5,
        order: 1,
        title: 'The "Tell Me About Yourself" Pitch',
        description: 'Deliver a crisp 60-second professional introduction tailored to a role.',
        grammarFocus: 'Sentence Structure',
        requiredTurns: 4,
        starterPrompt:
          'Welcome to your mock interview. Let us begin: Tell me about yourself and what draws you to this field.',
        successCriteria: 'Deliver a structured past-present-future career pitch with strong verbs.',
      },
      {
        id: 'l5-t2',
        levelNumber: 5,
        order: 2,
        title: 'Daily Standup & Status Updates',
        description: 'Summarize completed work, current priorities, and blockers concisely.',
        grammarFocus: 'Tenses',
        requiredTurns: 3,
        starterPrompt:
          "Good morning! It's our daily team sync. What did you finish yesterday, and what is your main priority today?",
        successCriteria: 'Switch accurately between past completed actions and present/future tasks.',
      },
      {
        id: 'l5-t3',
        levelNumber: 5,
        order: 3,
        title: 'Disagreeing Diplomatically',
        description: 'Push back on a colleague’s timeline or idea respectfully and constructively.',
        grammarFocus: 'Vocabulary',
        requiredTurns: 3,
        starterPrompt:
          'In our meeting, I suggest we launch the product tomorrow even though testing is unfinished. How do you respond politely?',
        successCriteria: 'Use diplomatic phrasing while presenting an alternative plan.',
      },
      {
        id: 'l5-t4',
        levelNumber: 5,
        order: 4,
        title: 'Behavioral Interview: Overcoming a Challenge',
        description: 'Answer a behavioral question using the Situation-Action-Result flow.',
        grammarFocus: 'Tenses',
        requiredTurns: 4,
        starterPrompt:
          'Tell me about a time you faced a difficult deadline or mistake at work or college. How did you handle it?',
        successCriteria: 'Explain situation, action taken, and measurable result clearly.',
      },
    ],
  },
  {
    levelNumber: 6,
    name: 'Advanced Fluency',
    subtitle: 'Nuanced arguments, leadership rhetoric, and natural phrasing',
    description:
      'Refine subtle phrasing, idiomatic precision, complex clauses, and persuasive leadership communication.',
    tasks: [
      {
        id: 'l6-t1',
        levelNumber: 6,
        order: 1,
        title: 'Executive Trade-Off Discussion',
        description: 'Compare competing business or social strategies with nuanced conditionals.',
        grammarFocus: 'Sentence Structure',
        requiredTurns: 4,
        starterPrompt:
          'If a growing company can only invest in either rapid customer acquisition or deep product reliability this year, which should it prioritize and why?',
        successCriteria: 'Use conditional structures and balanced trade-off reasoning across 4 turns.',
      },
      {
        id: 'l6-t2',
        levelNumber: 6,
        order: 2,
        title: 'Leading a Group Discussion',
        description: 'Synthesize multiple viewpoints and guide a group toward consensus.',
        grammarFocus: 'Vocabulary',
        requiredTurns: 4,
        starterPrompt:
          'You are moderating a panel on how AI tools affect university education. Open the discussion by framing both sides clearly.',
        successCriteria: 'Demonstrate formal discourse markers, synthesis, and precise vocabulary.',
      },
      {
        id: 'l6-t3',
        levelNumber: 6,
        order: 3,
        title: 'Persuasive Storytelling & Impact',
        description: 'Craft a compelling narrative to persuade stakeholders to adopt a new idea.',
        grammarFocus: 'Word Order',
        requiredTurns: 4,
        starterPrompt:
          'Pitch a community or workplace initiative you care about in 3–4 crisp sentences that make a decision-maker want to back it.',
        successCriteria: 'Use vivid, natural phrasing with crisp sentence rhythm.',
      },
      {
        id: 'l6-t4',
        levelNumber: 6,
        order: 4,
        title: 'Nuanced Cross-Cultural Feedback',
        description: 'Give candid, empathetic feedback on performance without sounding abrupt.',
        grammarFocus: 'Vocabulary',
        requiredTurns: 4,
        starterPrompt:
          'A talented teammate keeps missing documentation deadlines, slowing others down. Start a one-on-one feedback conversation with them.',
        successCriteria: 'Balance direct clarity with constructive tone and actionable next steps.',
      },
    ],
  },
];

export const PICTURE_SCENES: PictureScene[] = [
  {
    id: 'market',
    title: 'Morning Produce Market',
    caption: 'A bustling local market stall with fresh bananas, mangoes, spices, and customers talking.',
    aiContext:
      'The user is looking at a photograph of a lively morning local produce market in Kerala. A smiling vendor in a striped shirt and mundu is arranging green bananas in woven baskets. Mangoes, red chilies, turmeric, and spices sit in baskets on wooden tables with signs reading "FRESH PRODUCE" and "KERALA SPICES". On the right, two women in saris (one blue, one green) are smiling and chatting in the warm morning sunlight, with colorful cloth and a tiled roof in the background.',
  },
  {
    id: 'office',
    title: 'Collaborative Project Meeting',
    caption: 'Three professionals discussing a printed roadmap around a bright sunlit conference table.',
    aiContext:
      'The user is looking at a photograph of a bright modern office meeting room with large glass windows. Three colleagues are seated around a light wooden table with laptops displaying charts, open notebooks, and ceramic coffee mugs. They are pointing at and discussing a colorful printed project roadmap chart spread across the table, with a green indoor plant behind them.',
  },
  {
    id: 'station',
    title: 'Afternoon Railway Platform',
    caption: 'Travelers with luggage walking past a platform tea stall as an express train arrives.',
    aiContext:
      'The user is looking at a photograph of a sunlit Indian railway station platform (Platform 3) with a blue passenger train arriving. Travelers carrying backpacks and rolling suitcases walk past a busy wooden tea stall labeled "CHAI PE CHARCHA" where a vendor is serving tea. A hanging blue digital board shows "Platform 3 - Jodhpur Exp. Arriving".',
  },
];

export const PRACTICE_ACTIVITIES: PracticeActivity[] = [
  {
    slug: 'self-introduction',
    title: 'Self Introduction',
    subtitle: 'Personal & career intros',
    description: 'Practice introducing yourself confidently for social gatherings, classes, or interviews.',
    recommendedLevel: 1,
    mode: 'conversation',
    starterPrompt:
      "Let's practice a confident self-introduction. Imagine you are meeting someone new at a workshop. How would you introduce yourself in 2–3 sentences?",
    focusSkills: ['Subject-Verb Agreement', 'Articles', 'Sentence Structure'],
  },
  {
    slug: 'daily-routine',
    title: 'Daily Routine',
    subtitle: 'Habits, time & present tense',
    description: 'Describe your morning, work/study day, and evening habits using crisp time expressions.',
    recommendedLevel: 1,
    mode: 'conversation',
    starterPrompt:
      'Tell me about your typical weekday from morning until night. Start with what time you wake up and what you do first.',
    focusSkills: ['Tenses', 'Prepositions', 'Word Order'],
  },
  {
    slug: 'picture-description',
    title: 'Picture Description',
    subtitle: 'Observe & describe real scenes',
    description: 'Examine a real photograph and describe the people, actions, and setting in vivid English.',
    recommendedLevel: 2,
    mode: 'picture',
    starterPrompt:
      'Look closely at this picture. Start by describing the main people you see and what they are doing right now.',
    focusSkills: ['Tenses', 'Articles', 'Prepositions'],
  },
  {
    slug: 'storytelling',
    title: 'Storytelling',
    subtitle: 'Past tense narrative flow',
    description: 'Narrate a personal memory, funny incident, or short story with smooth chronological connectors.',
    recommendedLevel: 3,
    mode: 'conversation',
    starterPrompt:
      'Let us practice storytelling! Tell me about a surprising or funny moment from your school, college, or work life. Begin with when and where it happened.',
    focusSkills: ['Tenses', 'Sentence Structure', 'Vocabulary'],
  },
  {
    slug: 'vocabulary-challenges',
    title: 'Vocabulary Challenges',
    subtitle: 'Use precise words in context',
    description: 'Replace repetitive basic words ("good", "bad", "very big") with expressive natural alternatives.',
    recommendedLevel: 3,
    mode: 'vocabulary',
    starterPrompt:
      'Today’s vocabulary challenge: Instead of saying "very happy" or "very tired", use stronger words in a real sentence about your week. Try one sentence right now!',
    focusSkills: ['Vocabulary', 'Word Order', 'Sentence Structure'],
  },
  {
    slug: 'listen-and-answer',
    title: 'Listen and Answer',
    subtitle: 'Audio comprehension & reply',
    description: 'Listen to spoken English prompts at natural speed, understand key details, and reply aloud.',
    recommendedLevel: 2,
    mode: 'listening',
    starterPrompt:
      'Listen carefully to my question and answer in full sentences: Last Sunday, Rahul missed the 8:30 AM bus because he could not find his house keys, so he took an auto-rickshaw to the station. Why was Rahul late, and how did he travel instead?',
    focusSkills: ['Tenses', 'Sentence Structure', 'Prepositions'],
  },
  {
    slug: 'real-life-conversations',
    title: 'Real-Life Conversations',
    subtitle: 'Everyday roleplay scenarios',
    description: 'Roleplay realistic situations at banks, hospitals, restaurants, airports, and neighborhood shops.',
    recommendedLevel: 3,
    mode: 'conversation',
    starterPrompt:
      "Roleplay starts now: You are at a hotel reception desk, and your room's air conditioner is not cooling properly. Speak to me as the receptionist and explain what you need.",
    focusSkills: ['Prepositions', 'Sentence Structure', 'Vocabulary'],
  },
  {
    slug: 'interview-simulation',
    title: 'Interview Simulation',
    subtitle: 'Mock HR & technical Q&A',
    description: 'Answer real interview questions with strict grammar feedback and sharper professional phrasing.',
    recommendedLevel: 5,
    mode: 'interview',
    starterPrompt:
      'Welcome to your interview simulation. First question: Why are you interested in this role, and what strength makes you a strong fit for our team?',
    focusSkills: ['Tenses', 'Sentence Structure', 'Vocabulary'],
  },
  {
    slug: 'group-discussion',
    title: 'Group Discussion',
    subtitle: 'Structured points & rebuttals',
    description: 'Practice entering a discussion politely, agreeing/disagreeing with evidence, and summarizing.',
    recommendedLevel: 5,
    mode: 'conversation',
    starterPrompt:
      'Our group discussion topic today is: "Should college exams be replaced with project-based assessments?" Give your opening point clearly.',
    focusSkills: ['Sentence Structure', 'Vocabulary', 'Word Order'],
  },
  {
    slug: 'professional-communication',
    title: 'Professional Communication',
    subtitle: 'Meetings, updates & diplomacy',
    description: 'Handle client escalations, executive summaries, and polite follow-ups with poise.',
    recommendedLevel: 5,
    mode: 'conversation',
    starterPrompt:
      'Scenario: A client emails asking why a feature delivery slipped by three days. Explain the delay professionally and share the revised plan.',
    focusSkills: ['Vocabulary', 'Tenses', 'Sentence Structure'],
  },
];

export interface AssessmentPrompt {
  id: string;
  type: 'choice' | 'open';
  prompt: string;
  options?: string[];
  hintMalayalam?: string;
}

export const ASSESSMENT_PROMPTS: AssessmentPrompt[] = [
  {
    id: 'q1',
    type: 'choice',
    prompt: 'Choose the grammatically correct sentence:',
    options: [
      'Yesterday I am going to college.',
      'Yesterday I went to college.',
      'Yesterday I go to college.',
      'Yesterday I going to college.',
    ],
  },
  {
    id: 'q2',
    type: 'choice',
    prompt: 'Pick the best sentence for a regular habit:',
    options: [
      'She go to the office at 9 AM.',
      'She goes to the office at 9 AM.',
      'She going to the office in 9 AM.',
      'She is go to the office on 9 AM.',
    ],
  },
  {
    id: 'q3',
    type: 'choice',
    prompt: 'Which sentence uses articles and prepositions accurately?',
    options: [
      'I bought an umbrella and put it on the table.',
      'I bought a umbrella and put it in the table.',
      'I bought umbrella and put it at table.',
      'I bought the umbrella on yesterday.',
    ],
  },
  {
    id: 'q4',
    type: 'open',
    prompt: 'Write or speak 2–3 sentences introducing yourself and describing what you did yesterday.',
    hintMalayalam: 'നിങ്ങളെക്കുറിച്ചും ഇന്നലെ നിങ്ങൾ ചെയ്ത ഒരു കാര്യത്തെക്കുറിച്ചും 2–3 ഇംഗ്ലീഷ് വാക്യങ്ങളിൽ എഴുതുക അല്ലെങ്കിൽ പറയുക.',
  },
  {
    id: 'q5',
    type: 'open',
    prompt: 'Describe one goal you want to achieve this year and why it matters to you.',
    hintMalayalam: 'ഈ വർഷം നിങ്ങൾ നേടാൻ ആഗ്രഹിക്കുന്ന ഒരു ലക്ഷ്യവും അതിന്റെ കാരണവും ഇംഗ്ലീഷിൽ പങ്കുവയ്ക്കുക.',
  },
];
