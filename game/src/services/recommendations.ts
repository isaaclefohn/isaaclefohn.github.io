/**
 * Level recommendation client service.
 * Queries the Pinecone-backed recommendation API to suggest next levels.
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export interface LevelRecommendation {
  levelNumber: number;
  score: number;
  reason: string;
}

export interface RecommendationResponse {
  recommendations: LevelRecommendation[];
  fallback: number | null;
}

/**
 * Get personalized level recommendations based on player history.
 */
export async function getRecommendations(params: {
  completedLevels: number[];
  highestLevel: number;
  recentPerformance: {
    avgStars: number;
    avgCompletion: number;
    preferredGridSize: number;
    avgPieceComplexity: number;
    failTolerance: number;
    sessionLength: number;
  };
}): Promise<RecommendationResponse> {
  if (!API_URL) {
    return {
      recommendations: [],
      fallback: params.highestLevel + 1,
    };
  }

  try {
    const response = await fetch(`${API_URL}/api/recommend-level`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      return { recommendations: [], fallback: params.highestLevel + 1 };
    }

    return await response.json();
  } catch {
    return { recommendations: [], fallback: params.highestLevel + 1 };
  }
}

/**
 * Derive player performance metrics from their store data.
 * Used to build the preference vector for recommendations.
 */
export function derivePerformanceMetrics(
  levelStars: Record<number, number>,
  highestLevel: number
): {
  avgStars: number;
  avgCompletion: number;
  preferredGridSize: number;
  avgPieceComplexity: number;
  failTolerance: number;
  sessionLength: number;
} {
  const starValues = Object.values(levelStars);
  const avgStars = starValues.length > 0
    ? starValues.reduce((a, b) => a + b, 0) / starValues.length
    : 1;

  const completedCount = starValues.filter((s) => s > 0).length;
  const avgCompletion = highestLevel > 0 ? completedCount / highestLevel : 0.5;

  // Estimate preferred grid size from highest level
  const preferredGridSize = highestLevel > 150 ? 10 : 8;

  // Estimate piece complexity from highest level
  const avgPieceComplexity = Math.min(1, highestLevel / 200);

  // Fail tolerance: lower avg stars = higher tolerance for difficulty
  const failTolerance = Math.max(0.1, 1 - avgStars / 3);

  return {
    avgStars,
    avgCompletion,
    preferredGridSize,
    avgPieceComplexity,
    failTolerance,
    sessionLength: 120, // Default estimate
  };
}
