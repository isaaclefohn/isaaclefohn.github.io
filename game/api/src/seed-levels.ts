/**
 * Pinecone index seeding script.
 * POST /api/seed-levels
 *
 * Seeds the Pinecone index with level feature vectors for all 500 levels.
 * Should be called once during setup, then again whenever level configs change.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pinecone } from '@pinecone-database/pinecone';

const PINECONE_API_KEY = process.env.PINECONE_API_KEY ?? '';
const INDEX_NAME = 'block-blitz-levels';
const TOTAL_LEVELS = 500;

interface LevelMeta {
  levelNumber: number;
  gridSize: number;
  pieceComplexity: number;
  scoreTarget: number;
  isBossLevel: number;
  levelTier: number;
}

/** Generate features for a level based on its number (mirrors DifficultyScaler logic) */
function generateLevelFeatures(levelNumber: number): { values: number[]; metadata: LevelMeta } {
  let gridSize = 0; // normalized: 0 = 8x8, 1 = 10x10
  let pieceComplexity = 0;
  let scoreTarget = 0;
  let levelTier = 0;
  let isBossLevel = levelNumber % 25 === 0 && levelNumber > 0 ? 1 : 0;

  if (levelNumber <= 5) {
    gridSize = 0; pieceComplexity = 0.2; levelTier = 0;
    scoreTarget = (200 + levelNumber * 50) / 10000;
  } else if (levelNumber <= 20) {
    gridSize = 0; pieceComplexity = 0.3; levelTier = 0.2;
    scoreTarget = (400 + (levelNumber - 5) * 40) / 10000;
  } else if (levelNumber <= 50) {
    gridSize = 0; pieceComplexity = 0.5; levelTier = 0.4;
    scoreTarget = (800 + (levelNumber - 20) * 30) / 10000;
  } else if (levelNumber <= 100) {
    gridSize = 0; pieceComplexity = 0.7; levelTier = 0.6;
    scoreTarget = (1500 + (levelNumber - 50) * 25) / 10000;
  } else if (levelNumber <= 200) {
    gridSize = levelNumber > 150 ? 1 : 0; pieceComplexity = 0.8; levelTier = 0.8;
    scoreTarget = (2500 + (levelNumber - 100) * 20) / 10000;
  } else {
    gridSize = 1; pieceComplexity = 1.0; levelTier = 1.0;
    scoreTarget = (4000 + (levelNumber - 200) * 15) / 10000;
  }

  scoreTarget = Math.min(1, scoreTarget);

  const values = [
    gridSize,                                     // 0: grid size
    pieceComplexity,                              // 1: piece complexity
    scoreTarget,                                  // 2: score target
    levelTier > 0.6 ? levelTier * 0.5 : 0,       // 3: obstacle count
    isBossLevel,                                  // 4: boss level
    levelTier,                                    // 5: level tier
    0.3 + pieceComplexity * 0.4,                  // 6: avg piece size
    0.4 + levelTier * 0.3,                        // 7: piece variety
    1.5 + levelTier * 0.5,                        // 8: star difficulty ratio
    Math.max(0.2, 0.8 - levelTier * 0.5),         // 9: est. completion rate
    0.5,                                          // 10: avg score (updated later)
    0.5,                                          // 11: avg time (updated later)
    0.3 + levelTier * 0.3,                        // 12: combo frequency
    Math.min(0.8, 0.2 + levelTier * 0.5),         // 13: fail rate
    0.2 + levelTier * 0.2,                        // 14: replay rate
    0.5,                                          // 15: engagement (updated later)
  ];

  return {
    values,
    metadata: {
      levelNumber,
      gridSize,
      pieceComplexity,
      scoreTarget,
      isBossLevel,
      levelTier,
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Simple auth check — require a secret header
  const authHeader = req.headers['x-seed-secret'];
  if (authHeader !== process.env.SEED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!PINECONE_API_KEY) {
    return res.status(503).json({ error: 'Pinecone not configured' });
  }

  try {
    const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
    const index = pc.index(INDEX_NAME);

    // Generate and upsert all level vectors in batches
    const batchSize = 100;
    let seeded = 0;

    for (let start = 1; start <= TOTAL_LEVELS; start += batchSize) {
      const end = Math.min(start + batchSize - 1, TOTAL_LEVELS);
      const vectors = [];

      for (let i = start; i <= end; i++) {
        const { values, metadata } = generateLevelFeatures(i);
        vectors.push({
          id: `level-${i}`,
          values,
          metadata,
        });
      }

      await index.upsert(vectors);
      seeded += vectors.length;
    }

    return res.status(200).json({
      success: true,
      levelsSeeded: seeded,
      message: `Seeded ${seeded} level vectors into Pinecone index "${INDEX_NAME}"`,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return res.status(500).json({ error: 'Failed to seed levels' });
  }
}
