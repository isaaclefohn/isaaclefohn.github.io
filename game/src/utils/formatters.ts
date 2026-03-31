/** Format a score with comma separators: 12345 -> "12,345" */
export function formatScore(score: number): string {
  return score.toLocaleString();
}

/** Format seconds into MM:SS */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Format large numbers with abbreviations: 1500 -> "1.5K" */
export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}
