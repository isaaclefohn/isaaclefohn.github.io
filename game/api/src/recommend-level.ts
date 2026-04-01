/**
 * Pinecone-powered level recommendation API.
 * POST /api/recommend-level
 *
 * Uses player behavior vectors to find similar levels the player would enjoy.
 * Levels are vectorized by their characteristics (difficulty, piece complexity,
 * grid size, objective type) and player preferences are derived from their
 * performance history.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pinecone } from '@pinecone-database/pinecone';

const PINECONE_API_KEY = process.env.PINECONE_API_KEY ?? '';
const PINECONE_INDEX_HOST = process.env.PINECONE_INDEX_HOST ?? '';
const INDEX_NAME = 'block-blitz-levels';
const VECTOR_DIMENSION = 16;

/** Level feature vector components (16 dimensions) */
interface LevelFeatures {
  gridSize: number;           // 0: normalized 8=0, 10=1
  pieceComplexity: number;    // 1: 0-1 avg piece cell count normalized
  scoreTarget: number;        // 2: normalized score target
  obstacleCount: number;      // 3: normalized obstacle density
  isBossLevel: number;        // 4: 0 or 1
  levelTier: number;          // 5: 0-5 difficulty tier
  avgPieceSize: number;       // 6: avg cells per piece in pool
  pieceVariety: number;       // 7: number of unique pieces / total pieces
  starDifficulty: number;     // 8: ratio of 3-star threshold to target
  completionRate: number;     // 9: % of players who complete (updated over time)
  avgScore: number;           // 10: average player score (updated over time)
  avgTime: number;            // 11: average completion time (updated over time)
  comboFrequency: number;     // 12: how often combos happen on this level
  failRate: number;           // 13: % of attempts that fail
  replayRate: number;         // 14: % of players who replay for better score
  engagementScore: number;    // 15: composite engagement metric
}

/** Convert level parameters to a feature vector */
function levelToVector(features: Partial<LevelFeatures>): number[] {
  return [
    features.gridSize ?? 0,
    features.pieceComplexity ?? 0.5,
    features.scoreTarget ?? 0.5,
    features.obstacleCount ?? 0,
    features.isBossLevel ?? 0,
    features.levelTier ?? 0.5,
    features.avgPieceSize ?? 0.5,
    features.pieceVariety ?? 0.5,
    features.starDifficulty ?? 0.5,
    features.completionRate ?? 0.5,
    features.avgScore ?? 0.5,
    features.avgTime ?? 0.5,
    features.comboFrequency ?? 0.5,
    features.failRate ?? 0.3,
    features.replayRate ?? 0.2,
    features.engagementScore ?? 0.5,
  ];
}

/** Derive a player preference vector from their recent performance */
function playerPreferenceVector(recentPerformance: {
  avgStars: number;
  avgCompletion: number;
  preferredGridSize: number;
  avgPieceComplexity: number;
  failTolerance: number;
  sessionLength: number;
}): number[] {
  return levelToVector({
    gridSize: recentPerformance.preferredGridSize > 9 ? 1 : 0,
    pieceComplexity: recentPerformance.avgPieceComplexity,
    scoreTarget: Math.min(1, recentPerformance.avgStars / 3),
    obstacleCount: recentPerformance.avgCompletion > 0.7 ? 0.4 : 0.1,
    isBossLevel: 0,
    levelTier: recentPerformance.avgStars / 3,
    avgPieceSize: recentPerformance.avgPieceComplexity,
    pieceVariety: 0.6,
    starDifficulty: 1 - recentPerformance.failTolerance,
    completionRate: recentPerformance.avgCompletion,
    avgScore: recentPerformance.avgStars / 3,
    avgTime: Math.min(1, recentPerformance.sessionLength / 300),
    comboFrequency: 0.5,
    failRate: recentPerformance.failTolerance,
    replayRate: recentPerformance.avgStars >= 2.5 ? 0.6 : 0.2,
    engagementScore: recentPerformance.avgCompletion * 0.7 + recentPerformance.avgStars / 3 * 0.3,
  });
}

let pineconeClient: Pinecone | null = null;

function getPinecone(): Pinecone | null {
  if (!PINECONE_API_KEY) return null;
  if (!pineconeClient) {
    pineconeClient = new Pinecone({ apiKey: PINECONE_API_KEY });
  }
  return pineconeClient;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const pc = getPinecone();
  if (!pc) {
    return res.status(503).json({ error: 'Pinecone not configured' });
  }

  try {
    const {
      completedLevels = [],
      recentPerformance,
      highestLevel = 0,
    } = req.body;

    if (!recentPerformance) {
      return res.status(400).json({ error: 'Missing recentPerformance' });
    }

    const index = pc.index(INDEX_NAME);
    const queryVector = playerPreferenceVector(recentPerformance);

    // Query Pinecone for similar levels
    const results = await index.query({
      vector: queryVector,
      topK: 20,
      includeMetadata: true,
    });

    // Filter out completed levels and levels too far ahead
    const maxLevel = highestLevel + 5; // Don't recommend levels too far ahead
    const completedSet = new Set(completedLevels);

    const recommendations = (results.matches ?? [])
      .filter((match) => {
        const levelNum = match.metadata?.levelNumber as number;
        return levelNum && !completedSet.has(levelNum) && levelNum <= maxLevel;
      })
      .slice(0, 3)
      .map((match) => ({
        levelNumber: match.metadata?.levelNumber as number,
        score: match.score ?? 0,
        reason: getRecommendationReason(match.metadata as Record<string, unknown>),
      }));

    return res.status(200).json({
      recommendations,
      fallback: recommendations.length === 0 ? highestLevel + 1 : null,
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getRecommendationReason(metadata: Record<string, unknown>): string {
  const tier = metadata?.levelTier as number ?? 0;
  const boss = metadata?.isBossLevel as number ?? 0;

  if (boss) return 'Boss challenge awaits!';
  if (tier > 0.7) return 'A worthy challenge for your skill level';
  if (tier > 0.4) return 'Matches your play style';
  return 'Great for building momentum';
}

/**
 * Seed levels into Pinecone index.
 * POST /api/recommend-level with { action: "seed", levels: [...] }
 * Called once during initial setup or when level configs change.
 */
export async function seedLevels(
  pc: Pinecone,
  levels: Array<{ levelNumber: number; features: Partial<LevelFeatures> }>
): Promise<void> {
  const index = pc.index(INDEX_NAME);

  const vectors = levels.map((level) => ({
    id: `level-${level.levelNumber}`,
    values: levelToVector(level.features),
    metadata: {
      levelNumber: level.levelNumber,
      ...level.features,
    },
  }));

  // Upsert in batches of 100
  for (let i = 0; i < vectors.length; i += 100) {
    const batch = vectors.slice(i, i + 100);
    await index.upsert(batch);
  }
}
