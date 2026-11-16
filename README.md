# FluencyForge AI

An AI-powered personal English communication coach designed for Malayalam-speaking learners. FluencyForge AI combines structured daily lessons, real-time voice and text conversation, strict grammar inspection, and clear Malayalam (`മലയാളം`) explanations to build lasting speaking fluency.

---

## Key Features

- **Authentication & Proficiency Placement**
  - JWT-authenticated signup, login, logout, and learner profile settings (`bcryptjs` password hashing).
  - 5-step Initial English Proficiency Assessment (grammar diagnostics + spoken/written responses) evaluated by Gemini to place learners into the right level.

- **Conversational AI English Teacher (Gemini API)**
  - Friendly, encouraging coaching that strictly catches genuine grammar and vocabulary errors without falsely praising incorrect English.
  - Displays **Original vs. Corrected** sentences, explains why the error occurred in **simple Malayalam**, offers natural English alternatives and extra examples, prompts the learner to repeat corrected sentences, and asks **one question at a time**.

- **Grammar Engine**
  - Detects and categorizes mistakes across **Tenses**, **Articles**, **Prepositions**, **Subject-Verb Agreement**, **Sentence Structure**, **Vocabulary**, and **Word Order**.
  - Distinguishes **Genuine Errors** from **Optional Polish**.

- **Voice & Text Practice Studio**
  - Browser Speech-to-Text microphone recording with live Web Audio waveform visualization.
  - Editable transcript before sending, Text-to-Speech playback (`0.8x` / `1.0x`), repeat controls, microphone permission error handling, and seamless text fallback.

- **6-Level Structured Learning Journey**
  - Progressive levels: *Beginner English*, *Grammar Foundation*, *Daily Communication*, *Speaking Confidence*, *Professional English*, and *Advanced Fluency*.
  - Sequential task unlocking upon meeting turn requirements, with saved progress and unlimited retries.

- **10 Practice Activities**
  - *Self Introduction*, *Daily Routine*, *Picture Description* (with 3 curated visual scenes), *Storytelling*, *Vocabulary Challenges*, *Listen and Answer*, *Real-Life Conversations*, *Interview Simulation*, *Group Discussion*, and *Professional Communication*.

- **Mistake Memory & Personalized Revision**
  - Persists repeated mistakes, identifies weak grammar categories, and generates tailored revision drills from the learner's own error history.

- **Student Dashboard & Progress Analytics**
  - Tracks speaking time, daily goal progress, active streak, grammar accuracy, task completion, learned vocabulary with Malayalam meanings, and 7-day improvement trends.
  - Supports Light and Dark themes across desktop and mobile viewports.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Web Speech API (`SpeechRecognition` & `speechSynthesis`), Web Audio API (`AnalyserNode`)
- **Backend:** Node.js, Express.js, TypeScript (`tsx`)
- **AI:** `@google/genai` (`gemini-4-hydrogen`) on the server side
- **Database:** MongoDB via Mongoose (`MONGODB_URI`), with automatic durable local JSON persistence fallback (`./data/fluencyforge.db.json`) when `MONGODB_URI` is not set
- **Auth:** JWT (`jsonwebtoken`) + `bcryptjs`

---

## Project Structure

```text
├── server.ts                       # Express server + Vite middleware / production static serving
├── server/
│   ├── db/store.ts                 # Dual-mode repository (MongoDB Mongoose + local store fallback)
│   ├── middleware/auth.ts          # JWT verification middleware
│   ├── models/mongooseModels.ts    # Mongoose schemas
│   ├── routes/
│   │   ├── auth.ts                 # Signup, login, profile, proficiency assessment
│   │   ├── chat.ts                 # Sessions, AI teacher turns, repeat tracking
│   │   └── learning.ts             # Dashboard, journey, mistake memory, revision, vocabulary
│   └── services/gemini.ts          # Server-side @google/genai tutor, evaluator & drill generator
├── src/
│   ├── App.tsx                     # Main workspace shell & routing
│   ├── components/                 # UI views (Dashboard, AI Teacher, Journey, Activities, etc.)
│   ├── data/curriculum.ts          # 6-level curriculum, 10 activities & assessment prompts
│   ├── lib/                        # API client, speech utilities & image asset registry
│   └── types/fluency.ts            # Shared TypeScript interfaces
├── .env.example                    # Environment variable template
└── package.json
```

---

## Setup & Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   Copy `.env.example` to `.env` and fill in your values:
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   MONGODB_URI="mongodb+srv://..."   # Optional; omit to use local file persistence
   JWT_SECRET="replace-with-strong-random-secret"
   PORT=3000
   ```

3. **Run in development mode**
   ```bash
   npm run dev
   ```
   The app and API run together on `http://localhost:3000`.

4. **Type-check & build for production**
   ```bash
   npm run lint
   npm run build
   NODE_ENV=production npm start
   ```

---

## Core REST API Endpoints

- `GET /api/health` — Server, database mode, and Gemini configuration check
- `POST /api/auth/signup` / `POST /api/auth/login` — User registration and authentication
- `GET /api/auth/me` / `PATCH /api/auth/profile` — Authenticated user profile
- `POST /api/auth/assessment` — Evaluate initial English proficiency placement
- `GET /api/learning/dashboard` — Aggregated dashboard stats, weekly series, and tasks
- `GET /api/learning/journey` / `POST /api/learning/journey/retry` — 6-level progression & retries
- `GET /api/learning/mistakes` / `POST /api/learning/mistakes/revision` — Mistake memory & AI revision drills
- `GET /api/learning/vocabulary` / `POST /api/learning/vocabulary/:id/toggle` — Vocabulary tracker
- `POST /api/chat/start` / `POST /api/chat/turn` — Start sessions and process voice/text tutor turns
