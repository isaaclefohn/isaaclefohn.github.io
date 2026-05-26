/**
 * Player inbox / mail system.
 * Server-style messages delivered to players with optional rewards.
 * Used for announcements, event notices, apology gifts, and milestone
 * celebrations. Messages have an expiry after which they disappear.
 */

export type InboxMessageType = 'system' | 'reward' | 'event' | 'milestone';

export interface InboxMessage {
  id: string;
  type: InboxMessageType;
  title: string;
  body: string;
  icon: string;
  color: string;
  /** Timestamp when message was sent */
  sentAt: number;
  /** Hours after sentAt before message expires (0 = never) */
  expiresInHours: number;
  /** Optional attached reward */
  reward?: {
    coins?: number;
    gems?: number;
    bomb?: number;
    rowClear?: number;
    colorClear?: number;
  };
}

export interface InboxState {
  messages: InboxMessage[];
  claimedIds: string[];
  dismissedIds: string[];
}

/** Generate the welcome message for new players */
export function generateWelcomeMessage(): InboxMessage {
  return {
    id: 'welcome',
    type: 'system',
    title: 'Welcome to Chroma!',
    body: 'Thanks for playing! Here\'s a starter gift to get you going. Check your inbox often for more rewards and news.',
    icon: 'gift',
    color: '#4ADE80',
    sentAt: Date.now(),
    expiresInHours: 0,
    reward: { coins: 200, gems: 5, bomb: 1 },
  };
}

/** Generate a comeback message for returning players */
export function generateComebackMessage(daysAway: number): InboxMessage {
  return {
    id: `comeback_${Date.now()}`,
    type: 'reward',
    title: 'Welcome back!',
    body: `We missed you for ${daysAway} days. Enjoy these gifts as a thank you for returning!`,
    icon: 'sparkle',
    color: '#C084FC',
    sentAt: Date.now(),
    expiresInHours: 168, // 1 week
    reward: {
      coins: Math.min(1000, daysAway * 50),
      gems: Math.min(20, Math.floor(daysAway / 2)),
      bomb: 1,
    },
  };
}

/** Generate a milestone message for reaching a level */
export function generateMilestoneMessage(level: number): InboxMessage | null {
  const milestones: Record<number, { title: string; reward: InboxMessage['reward'] }> = {
    10: {
      title: 'Level 10 Reached!',
      reward: { coins: 200, gems: 5 },
    },
    25: {
      title: 'Quarter Century!',
      reward: { coins: 500, gems: 10, bomb: 1 },
    },
    50: {
      title: 'Halfway There!',
      reward: { coins: 1000, gems: 20, rowClear: 2 },
    },
    100: {
      title: 'Century Achievement!',
      reward: { coins: 2500, gems: 50, colorClear: 3 },
    },
    200: {
      title: 'Double Century!',
      reward: { coins: 5000, gems: 100 },
    },
    500: {
      title: 'Legendary Master!',
      reward: { coins: 15000, gems: 300 },
    },
  };

  const milestone = milestones[level];
  if (!milestone) return null;

  return {
    id: `milestone_${level}`,
    type: 'milestone',
    title: milestone.title,
    body: `You've reached level ${level}! Congratulations on your incredible progress. Keep it up!`,
    icon: 'trophy',
    color: '#FACC15',
    sentAt: Date.now(),
    expiresInHours: 0,
    reward: milestone.reward,
  };
}

/** Filter messages to remove expired/dismissed ones */
export function getActiveMessages(state: InboxState): InboxMessage[] {
  const now = Date.now();
  return state.messages.filter((msg) => {
    if (state.dismissedIds.includes(msg.id)) return false;
    if (msg.expiresInHours === 0) return true;
    const expiresAt = msg.sentAt + msg.expiresInHours * 60 * 60 * 1000;
    return now < expiresAt;
  });
}

/** Count messages with unclaimed rewards */
export function getUnclaimedCount(state: InboxState): number {
  return getActiveMessages(state).filter(
    (msg) => msg.reward && !state.claimedIds.includes(msg.id),
  ).length;
}

/** Format time ago for display */
export function getTimeAgo(sentAt: number, now: number = Date.now()): string {
  const diffMs = now - sentAt;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  return `${mins}m ago`;
}
