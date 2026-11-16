import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { dbStore } from '../db/store';
import { type AuthenticatedRequest, requireAuth, signAuthToken } from '../middleware/auth';
import { evaluateInitialAssessment } from '../services/gemini';

export const authRouter = Router();

authRouter.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
      return;
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const existing = await dbStore.findUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await dbStore.createUser({ name, email, passwordHash });
    const token = signAuthToken(user.id);

    res.status(201).json({ token, user });
  } catch (err: any) {
    console.error('Signup error:', err);
    res.status(500).json({ error: err?.message || 'Unable to create account right now.' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const userRecord = await dbStore.findUserByEmail(email);
    if (!userRecord) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const valid = await bcrypt.compare(password, userRecord.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const { passwordHash: _omit, ...user } = userRecord;
    const token = signAuthToken(user.id);
    res.json({ token, user });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: err?.message || 'Unable to log in right now.' });
  }
});

authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await dbStore.findUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to load user profile.' });
  }
});

authRouter.patch('/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, dailyGoalMinutes } = req.body || {};
    const patch: any = {};
    if (typeof name === 'string' && name.trim().length >= 2) {
      patch.name = name.trim();
    }
    if (typeof dailyGoalMinutes === 'number' && dailyGoalMinutes >= 5 && dailyGoalMinutes <= 180) {
      patch.dailyGoalMinutes = Math.round(dailyGoalMinutes);
    }

    const user = await dbStore.updateUser(req.userId!, patch);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update profile.' });
  }
});

authRouter.post('/assessment', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { q1, q2, q3, q4, q5 } = req.body || {};
    if (!q1 || !q2 || !q3 || !q4 || !q5) {
      res.status(400).json({ error: 'Please complete all 5 assessment items before submitting.' });
      return;
    }

    const evaluation = await evaluateInitialAssessment({
      q1: String(q1),
      q2: String(q2),
      q3: String(q3),
      q4: String(q4),
      q5: String(q5),
    });

    const user = await dbStore.applyAssessmentLevel(
      req.userId!,
      evaluation.recommendedLevel,
      evaluation.summary
    );

    res.json({
      user,
      evaluation,
    });
  } catch (err: any) {
    console.error('Assessment evaluation error:', err);
    res.status(500).json({
      error: err?.message || 'Could not evaluate placement assessment. Please check your Gemini API configuration.',
    });
  }
});
