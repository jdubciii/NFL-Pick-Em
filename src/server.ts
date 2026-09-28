import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from './db/client';
import { JWT_SECRET, requireAuth } from './middleware/auth';
import { picksRouter } from './routes/picks';
import { adminRouter } from './routes/admin';

export const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Routes
app.use('/api/picks', picksRouter);
app.use('/api/admin', adminRouter);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/auth/login
 * Validates user credentials and issues a JWT token.
 */
app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An unexpected error occurred during login.' });
  }
});

export interface LeaderboardUserEntry {
  user_id: string;
  email: string;
  total_points: number;
  correct_picks: number;
  total_picks: number;
  is_weekly_loser: boolean;
}

/**
 * GET /api/pools/:pool_id/leaderboard
 * Protected endpoint that returns the pool leaderboard aggregated from PickResult records.
 * Sorts users descending by total points and tags the lowest scoring user(s) with is_weekly_loser: true.
 */
app.get('/api/pools/:pool_id/leaderboard', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const poolId = String(req.params.pool_id);

  if (!poolId) {
    res.status(400).json({ error: 'pool_id is required.' });
    return;
  }

  try {
    // 1. Fetch pool, memberships, and all picks with graded results
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        picks: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
            result: true,
          },
        },
      },
    });

    if (!pool) {
      res.status(404).json({ error: 'Pool not found.' });
      return;
    }

    // 2. Aggregate points and stats by user
    const userMap = new Map<string, LeaderboardUserEntry>();

    // Initialize all pool members
    for (const membership of pool.memberships) {
      if (!userMap.has(membership.user.id)) {
        userMap.set(membership.user.id, {
          user_id: membership.user.id,
          email: membership.user.email,
          total_points: 0,
          correct_picks: 0,
          total_picks: 0,
          is_weekly_loser: false,
        });
      }
    }

    // Include users with picks and accumulate graded points from PickResult
    for (const pick of pool.picks) {
      let entry = userMap.get(pick.userId);
      if (!entry) {
        entry = {
          user_id: pick.user.id,
          email: pick.user.email,
          total_points: 0,
          correct_picks: 0,
          total_picks: 0,
          is_weekly_loser: false,
        };
        userMap.set(pick.userId, entry);
      }

      entry.total_picks += 1;

      if (pick.result) {
        entry.total_points += Number(pick.result.pointsAwarded);
        if (pick.result.isCorrect) {
          entry.correct_picks += 1;
        }
      }
    }

    const leaderboard = Array.from(userMap.values());

    // 3. Sort descending by total points, then by correct picks
    leaderboard.sort((a, b) => {
      if (b.total_points !== a.total_points) {
        return b.total_points - a.total_points;
      }
      return b.correct_picks - a.correct_picks;
    });

    // 4. Calculate absolute lowest score and set is_weekly_loser flag
    if (leaderboard.length > 0) {
      const minPoints = Math.min(...leaderboard.map((u) => u.total_points));
      for (const entry of leaderboard) {
        if (entry.total_points === minPoints) {
          entry.is_weekly_loser = true;
        }
      }
    }

    res.json({
      pool_id: pool.id,
      pool_name: pool.name,
      leaderboard,
    });
  } catch (error) {
    console.error('Leaderboard calculation error:', error);
    res.status(500).json({ error: 'Failed to generate leaderboard.' });
  }
});

// Start listening if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
