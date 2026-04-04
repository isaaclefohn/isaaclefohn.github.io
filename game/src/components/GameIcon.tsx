/**
 * Custom View-based icon system — no emojis.
 * Every icon is built from RN Views and styled Text for a unique, premium look.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';

export type IconName =
  | 'coin'
  | 'gem'
  | 'star'
  | 'star-outline'
  | 'fire'
  | 'play'
  | 'pause'
  | 'calendar'
  | 'map'
  | 'shop'
  | 'trophy'
  | 'gear'
  | 'bomb'
  | 'lightning'
  | 'palette'
  | 'sound'
  | 'music'
  | 'haptic'
  | 'grid'
  | 'ghost'
  | 'lock'
  | 'check'
  | 'medal-gold'
  | 'medal-silver'
  | 'medal-bronze'
  | 'book'
  | 'film'
  | 'refresh'
  | 'gift'
  | 'crown'
  | 'sparkle'
  | 'target'
  | 'pointer'
  | 'shield'
  | 'home'
  | 'back'
  | 'gamepad';

interface GameIconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export const GameIcon: React.FC<GameIconProps> = ({ name, size = 20, color }) => {
  const s = size;
  const half = s / 2;

  switch (name) {
    case 'coin':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          <View style={{
            width: s, height: s, borderRadius: s / 2,
            backgroundColor: color || COLORS.accentGold,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: s * 0.08, borderColor: color || COLORS.accentGoldDark,
          }}>
            <View style={{
              width: s * 0.5, height: s * 0.15, borderRadius: s * 0.04,
              backgroundColor: COLORS.accentGoldDark, opacity: 0.6,
            }} />
          </View>
        </View>
      );

    case 'gem':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          <View style={{
            width: s * 0.7, height: s * 0.7,
            backgroundColor: color || '#C084FC',
            transform: [{ rotate: '45deg' }],
            borderRadius: s * 0.1,
            borderWidth: s * 0.06, borderColor: '#A855F7',
          }}>
            <View style={{
              position: 'absolute', top: '15%', left: '15%',
              width: '30%', height: '30%',
              backgroundColor: 'rgba(255,255,255,0.35)',
              borderRadius: s * 0.04,
            }} />
          </View>
        </View>
      );

    case 'star':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          <Text style={{
            fontSize: s * 0.9, lineHeight: s * 1.05,
            color: color || COLORS.accentGold,
            textShadowColor: color || COLORS.accentGold,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: s * 0.3,
          }}>{'\u2605'}</Text>
        </View>
      );

    case 'star-outline':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          <Text style={{
            fontSize: s * 0.9, lineHeight: s * 1.05,
            color: color || COLORS.textMuted,
          }}>{'\u2606'}</Text>
        </View>
      );

    case 'fire':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          {/* Outer flame */}
          <View style={{
            width: s * 0.55, height: s * 0.7,
            backgroundColor: color || '#FF6B2B',
            borderTopLeftRadius: s * 0.5,
            borderTopRightRadius: s * 0.5,
            borderBottomLeftRadius: s * 0.2,
            borderBottomRightRadius: s * 0.2,
            alignItems: 'center', justifyContent: 'flex-end',
          }}>
            {/* Inner flame */}
            <View style={{
              width: s * 0.28, height: s * 0.35,
              backgroundColor: COLORS.accentGold,
              borderTopLeftRadius: s * 0.3,
              borderTopRightRadius: s * 0.3,
              borderBottomLeftRadius: s * 0.08,
              borderBottomRightRadius: s * 0.08,
              marginBottom: s * 0.04,
            }} />
          </View>
        </View>
      );

    case 'play':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          <View style={{
            width: 0, height: 0,
            borderLeftWidth: s * 0.5, borderLeftColor: color || COLORS.textPrimary,
            borderTopWidth: s * 0.35, borderTopColor: 'transparent',
            borderBottomWidth: s * 0.35, borderBottomColor: 'transparent',
            marginLeft: s * 0.1,
          }} />
        </View>
      );

    case 'pause':
      return (
        <View style={[iconStyles.center, { width: s, height: s, flexDirection: 'row', gap: s * 0.12 }]}>
          <View style={{ width: s * 0.22, height: s * 0.55, backgroundColor: color || COLORS.textPrimary, borderRadius: s * 0.04 }} />
          <View style={{ width: s * 0.22, height: s * 0.55, backgroundColor: color || COLORS.textPrimary, borderRadius: s * 0.04 }} />
        </View>
      );

    case 'calendar':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          <View style={{
            width: s * 0.7, height: s * 0.65,
            backgroundColor: color || COLORS.accent,
            borderRadius: s * 0.1,
            borderTopWidth: s * 0.12, borderTopColor: color || COLORS.accentDark,
          }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: s * 0.06, gap: s * 0.04, marginTop: s * 0.04 }}>
              {[0,1,2,3,4,5].map(i => (
                <View key={i} style={{ width: s * 0.1, height: s * 0.08, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 1 }} />
              ))}
            </View>
          </View>
        </View>
      );

    case 'map':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          <View style={{
            width: s * 0.7, height: s * 0.6,
            borderRadius: s * 0.08,
            borderWidth: s * 0.06, borderColor: color || COLORS.info,
            flexDirection: 'row',
          }}>
            <View style={{ flex: 1, borderRightWidth: s * 0.04, borderRightColor: color || COLORS.info, opacity: 0.5 }} />
            <View style={{ flex: 1 }} />
          </View>
          {/* Pin dot */}
          <View style={{
            position: 'absolute', top: s * 0.2, right: s * 0.22,
            width: s * 0.12, height: s * 0.12,
            borderRadius: s * 0.06,
            backgroundColor: COLORS.accent,
          }} />
        </View>
      );

    case 'shop':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          {/* Bag body */}
          <View style={{
            width: s * 0.6, height: s * 0.5,
            backgroundColor: color || COLORS.accentGold,
            borderBottomLeftRadius: s * 0.1,
            borderBottomRightRadius: s * 0.1,
            marginTop: s * 0.15,
          }} />
          {/* Handle */}
          <View style={{
            position: 'absolute', top: s * 0.08,
            width: s * 0.35, height: s * 0.25,
            borderWidth: s * 0.06, borderColor: color || COLORS.accentGold,
            borderTopLeftRadius: s * 0.2,
            borderTopRightRadius: s * 0.2,
            borderBottomWidth: 0,
          }} />
        </View>
      );

    case 'trophy':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          {/* Cup */}
          <View style={{
            width: s * 0.5, height: s * 0.4,
            backgroundColor: color || COLORS.accentGold,
            borderBottomLeftRadius: s * 0.25,
            borderBottomRightRadius: s * 0.25,
          }} />
          {/* Stem */}
          <View style={{ width: s * 0.12, height: s * 0.12, backgroundColor: color || COLORS.accentGold }} />
          {/* Base */}
          <View style={{ width: s * 0.35, height: s * 0.08, backgroundColor: color || COLORS.accentGold, borderRadius: s * 0.04 }} />
          {/* Handles */}
          <View style={{
            position: 'absolute', top: s * 0.22, left: s * 0.12,
            width: s * 0.12, height: s * 0.18,
            borderWidth: s * 0.04, borderColor: color || COLORS.accentGoldDark,
            borderRightWidth: 0, borderTopLeftRadius: s * 0.1, borderBottomLeftRadius: s * 0.1,
          }} />
          <View style={{
            position: 'absolute', top: s * 0.22, right: s * 0.12,
            width: s * 0.12, height: s * 0.18,
            borderWidth: s * 0.04, borderColor: color || COLORS.accentGoldDark,
            borderLeftWidth: 0, borderTopRightRadius: s * 0.1, borderBottomRightRadius: s * 0.1,
          }} />
        </View>
      );

    case 'gear':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          {/* Outer ring with notches simulated by border */}
          <View style={{
            width: s * 0.65, height: s * 0.65,
            borderRadius: s * 0.325,
            borderWidth: s * 0.1, borderColor: color || COLORS.textSecondary,
          }}>
            <View style={{
              position: 'absolute', top: '25%', left: '25%',
              width: '50%', height: '50%',
              borderRadius: s,
              backgroundColor: color || COLORS.textSecondary,
            }} />
          </View>
          {/* Gear teeth (4 cross bars) */}
          <View style={{ position: 'absolute', width: s * 0.85, height: s * 0.14, backgroundColor: color || COLORS.textSecondary, borderRadius: s * 0.04 }} />
          <View style={{ position: 'absolute', width: s * 0.14, height: s * 0.85, backgroundColor: color || COLORS.textSecondary, borderRadius: s * 0.04 }} />
          <View style={{ position: 'absolute', width: s * 0.85, height: s * 0.14, backgroundColor: color || COLORS.textSecondary, borderRadius: s * 0.04, transform: [{ rotate: '45deg' }] }} />
          <View style={{ position: 'absolute', width: s * 0.14, height: s * 0.85, backgroundColor: color || COLORS.textSecondary, borderRadius: s * 0.04, transform: [{ rotate: '45deg' }] }} />
          {/* Center dot */}
          <View style={{
            position: 'absolute',
            width: s * 0.22, height: s * 0.22,
            borderRadius: s * 0.11,
            backgroundColor: COLORS.surface,
          }} />
        </View>
      );

    case 'bomb':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          <View style={{
            width: s * 0.6, height: s * 0.6,
            borderRadius: s * 0.3,
            backgroundColor: color || '#3A3A5A',
            marginTop: s * 0.1,
          }}>
            {/* Highlight */}
            <View style={{
              position: 'absolute', top: s * 0.08, left: s * 0.1,
              width: s * 0.15, height: s * 0.1,
              backgroundColor: 'rgba(255,255,255,0.25)',
              borderRadius: s * 0.05,
            }} />
          </View>
          {/* Fuse */}
          <View style={{
            position: 'absolute', top: s * 0.02, right: s * 0.25,
            width: s * 0.06, height: s * 0.2,
            backgroundColor: '#8B7355',
            borderRadius: s * 0.03,
            transform: [{ rotate: '20deg' }],
          }} />
          {/* Spark */}
          <View style={{
            position: 'absolute', top: 0, right: s * 0.22,
            width: s * 0.1, height: s * 0.1,
            borderRadius: s * 0.05,
            backgroundColor: COLORS.accentGold,
            shadowColor: COLORS.accentGold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4,
          }} />
        </View>
      );

    case 'lightning':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          <Text style={{
            fontSize: s * 0.85, lineHeight: s * 1.1,
            color: color || COLORS.accentGold,
            fontWeight: '900',
            textShadowColor: color || COLORS.accentGold,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: s * 0.2,
          }}>{'\u26A1'}</Text>
        </View>
      );

    case 'palette':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          <View style={{
            width: s * 0.7, height: s * 0.6,
            borderRadius: s * 0.3,
            backgroundColor: color || COLORS.surfaceLight,
            borderWidth: s * 0.05, borderColor: COLORS.surfaceBorder,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s * 0.06,
          }}>
            <View style={{ width: s * 0.13, height: s * 0.13, borderRadius: s * 0.065, backgroundColor: COLORS.blocks[0] }} />
            <View style={{ width: s * 0.13, height: s * 0.13, borderRadius: s * 0.065, backgroundColor: COLORS.blocks[2] }} />
            <View style={{ width: s * 0.13, height: s * 0.13, borderRadius: s * 0.065, backgroundColor: COLORS.blocks[4] }} />
          </View>
        </View>
      );

    case 'sound':
      return (
        <View style={[iconStyles.center, { width: s, height: s, flexDirection: 'row' }]}>
          <View style={{ width: s * 0.18, height: s * 0.3, backgroundColor: color || COLORS.textSecondary, borderRadius: s * 0.03 }} />
          <View style={{
            width: 0, height: 0,
            borderLeftWidth: s * 0.2, borderLeftColor: color || COLORS.textSecondary,
            borderTopWidth: s * 0.15, borderTopColor: 'transparent',
            borderBottomWidth: s * 0.15, borderBottomColor: 'transparent',
          }} />
          {/* Sound waves */}
          <View style={{
            marginLeft: s * 0.06,
            width: s * 0.12, height: s * 0.4,
            borderWidth: s * 0.04, borderColor: color || COLORS.textSecondary,
            borderLeftWidth: 0,
            borderTopRightRadius: s * 0.2, borderBottomRightRadius: s * 0.2,
          }} />
        </View>
      );

    case 'music':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          {/* Note stem */}
          <View style={{
            position: 'absolute', right: s * 0.25, top: s * 0.15,
            width: s * 0.06, height: s * 0.5,
            backgroundColor: color || COLORS.textSecondary,
          }} />
          {/* Note head */}
          <View style={{
            position: 'absolute', bottom: s * 0.18, left: s * 0.2,
            width: s * 0.22, height: s * 0.16,
            backgroundColor: color || COLORS.textSecondary,
            borderRadius: s * 0.1,
            transform: [{ rotate: '-20deg' }],
          }} />
          {/* Flag */}
          <View style={{
            position: 'absolute', right: s * 0.2, top: s * 0.15,
            width: s * 0.15, height: s * 0.2,
            borderWidth: s * 0.04, borderColor: color || COLORS.textSecondary,
            borderLeftWidth: 0, borderBottomWidth: 0,
            borderTopRightRadius: s * 0.1,
          }} />
        </View>
      );

    case 'haptic':
      return (
        <View style={[iconStyles.center, { width: s, height: s, flexDirection: 'row', gap: s * 0.08 }]}>
          <View style={{ width: s * 0.08, height: s * 0.35, backgroundColor: color || COLORS.textSecondary, borderRadius: s * 0.04, opacity: 0.5 }} />
          <View style={{ width: s * 0.08, height: s * 0.55, backgroundColor: color || COLORS.textSecondary, borderRadius: s * 0.04 }} />
          <View style={{ width: s * 0.08, height: s * 0.3, backgroundColor: color || COLORS.textSecondary, borderRadius: s * 0.04, opacity: 0.7 }} />
          <View style={{ width: s * 0.08, height: s * 0.5, backgroundColor: color || COLORS.textSecondary, borderRadius: s * 0.04, opacity: 0.6 }} />
          <View style={{ width: s * 0.08, height: s * 0.25, backgroundColor: color || COLORS.textSecondary, borderRadius: s * 0.04, opacity: 0.4 }} />
        </View>
      );

    case 'grid':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: s * 0.6, gap: s * 0.05 }}>
            {[0,1,2,3].map(i => (
              <View key={i} style={{
                width: s * 0.25, height: s * 0.25,
                backgroundColor: color || COLORS.textSecondary,
                borderRadius: s * 0.04, opacity: i % 2 === 0 ? 0.8 : 0.4,
              }} />
            ))}
          </View>
        </View>
      );

    case 'ghost':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          <View style={{
            width: s * 0.6, height: s * 0.55,
            backgroundColor: color || 'rgba(255,255,255,0.2)',
            borderTopLeftRadius: s * 0.3,
            borderTopRightRadius: s * 0.3,
            borderBottomLeftRadius: s * 0.06,
            borderBottomRightRadius: s * 0.06,
            alignItems: 'center', paddingTop: s * 0.1,
          }}>
            <View style={{ flexDirection: 'row', gap: s * 0.1 }}>
              <View style={{ width: s * 0.1, height: s * 0.1, borderRadius: s * 0.05, backgroundColor: COLORS.textMuted }} />
              <View style={{ width: s * 0.1, height: s * 0.1, borderRadius: s * 0.05, backgroundColor: COLORS.textMuted }} />
            </View>
          </View>
        </View>
      );

    case 'lock':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          {/* Shackle */}
          <View style={{
            width: s * 0.35, height: s * 0.25,
            borderWidth: s * 0.06, borderColor: color || COLORS.textMuted,
            borderTopLeftRadius: s * 0.2,
            borderTopRightRadius: s * 0.2,
            borderBottomWidth: 0,
          }} />
          {/* Body */}
          <View style={{
            width: s * 0.5, height: s * 0.35,
            backgroundColor: color || COLORS.textMuted,
            borderRadius: s * 0.06,
          }} />
        </View>
      );

    case 'check':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          <View style={{
            width: s * 0.6, height: s * 0.6,
            borderRadius: s * 0.3,
            backgroundColor: color || COLORS.success,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: s * 0.4, color: COLORS.textPrimary, fontWeight: '900', marginTop: -s * 0.02 }}>{'\u2713'}</Text>
          </View>
        </View>
      );

    case 'medal-gold':
      return <MedalIcon size={s} color="#FACC15" borderColor="#CA9A06" />;
    case 'medal-silver':
      return <MedalIcon size={s} color="#C0C0C0" borderColor="#909090" />;
    case 'medal-bronze':
      return <MedalIcon size={s} color="#CD7F32" borderColor="#A0621A" />;

    case 'book':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          <View style={{
            width: s * 0.55, height: s * 0.65,
            backgroundColor: color || COLORS.info,
            borderRadius: s * 0.06,
            borderLeftWidth: s * 0.08, borderLeftColor: color ? color : COLORS.info,
          }}>
            {/* Pages */}
            <View style={{
              position: 'absolute', top: s * 0.06, right: s * 0.06,
              width: s * 0.3, height: s * 0.04,
              backgroundColor: 'rgba(255,255,255,0.4)',
              borderRadius: 1,
            }} />
            <View style={{
              position: 'absolute', top: s * 0.15, right: s * 0.06,
              width: s * 0.25, height: s * 0.04,
              backgroundColor: 'rgba(255,255,255,0.3)',
              borderRadius: 1,
            }} />
          </View>
        </View>
      );

    case 'film':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          <View style={{
            width: s * 0.7, height: s * 0.5,
            backgroundColor: color || COLORS.surfaceLight,
            borderRadius: s * 0.06,
            borderWidth: s * 0.04, borderColor: color || COLORS.textSecondary,
            alignItems: 'center', justifyContent: 'center',
          }}>
            {/* Play triangle */}
            <View style={{
              width: 0, height: 0,
              borderLeftWidth: s * 0.18, borderLeftColor: color || COLORS.textSecondary,
              borderTopWidth: s * 0.12, borderTopColor: 'transparent',
              borderBottomWidth: s * 0.12, borderBottomColor: 'transparent',
              marginLeft: s * 0.06,
            }} />
          </View>
        </View>
      );

    case 'refresh':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          <View style={{
            width: s * 0.55, height: s * 0.55,
            borderWidth: s * 0.08, borderColor: color || COLORS.textSecondary,
            borderRadius: s * 0.3,
            borderRightColor: 'transparent',
          }} />
          {/* Arrow head */}
          <View style={{
            position: 'absolute', top: s * 0.15, right: s * 0.18,
            width: 0, height: 0,
            borderBottomWidth: s * 0.12, borderBottomColor: color || COLORS.textSecondary,
            borderLeftWidth: s * 0.08, borderLeftColor: 'transparent',
            borderRightWidth: s * 0.08, borderRightColor: 'transparent',
          }} />
        </View>
      );

    case 'gift':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          {/* Bow */}
          <View style={{ flexDirection: 'row', marginBottom: -s * 0.02 }}>
            <View style={{ width: s * 0.18, height: s * 0.16, backgroundColor: COLORS.accent, borderTopLeftRadius: s * 0.1, borderTopRightRadius: s * 0.02 }} />
            <View style={{ width: s * 0.18, height: s * 0.16, backgroundColor: COLORS.accent, borderTopRightRadius: s * 0.1, borderTopLeftRadius: s * 0.02 }} />
          </View>
          {/* Box */}
          <View style={{
            width: s * 0.6, height: s * 0.4,
            backgroundColor: color || COLORS.accent,
            borderRadius: s * 0.06,
          }}>
            {/* Ribbon vertical */}
            <View style={{ position: 'absolute', left: '42%', width: '16%', height: '100%', backgroundColor: COLORS.accentGold }} />
          </View>
        </View>
      );

    case 'crown':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            {/* Left peak */}
            <View style={{
              width: 0, height: 0,
              borderBottomWidth: s * 0.3, borderBottomColor: color || COLORS.accentGold,
              borderLeftWidth: s * 0.1, borderLeftColor: 'transparent',
              borderRightWidth: s * 0.1, borderRightColor: 'transparent',
            }} />
            {/* Center peak (taller) */}
            <View style={{
              width: 0, height: 0,
              borderBottomWidth: s * 0.4, borderBottomColor: color || COLORS.accentGold,
              borderLeftWidth: s * 0.12, borderLeftColor: 'transparent',
              borderRightWidth: s * 0.12, borderRightColor: 'transparent',
              marginHorizontal: -s * 0.02,
            }} />
            {/* Right peak */}
            <View style={{
              width: 0, height: 0,
              borderBottomWidth: s * 0.3, borderBottomColor: color || COLORS.accentGold,
              borderLeftWidth: s * 0.1, borderLeftColor: 'transparent',
              borderRightWidth: s * 0.1, borderRightColor: 'transparent',
            }} />
          </View>
          {/* Band */}
          <View style={{
            width: s * 0.62, height: s * 0.12,
            backgroundColor: color || COLORS.accentGold,
            borderRadius: s * 0.03,
            marginTop: -s * 0.01,
          }} />
        </View>
      );

    case 'sparkle':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          {/* Main diamond */}
          <View style={{
            width: s * 0.35, height: s * 0.35,
            backgroundColor: color || COLORS.accentGold,
            transform: [{ rotate: '45deg' }],
            shadowColor: color || COLORS.accentGold,
            shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: s * 0.15,
          }} />
          {/* Small accent */}
          <View style={{
            position: 'absolute', top: s * 0.1, right: s * 0.15,
            width: s * 0.12, height: s * 0.12,
            backgroundColor: color || COLORS.accentGold,
            transform: [{ rotate: '45deg' }],
            opacity: 0.6,
          }} />
          <View style={{
            position: 'absolute', bottom: s * 0.15, left: s * 0.12,
            width: s * 0.08, height: s * 0.08,
            backgroundColor: color || COLORS.accentGold,
            transform: [{ rotate: '45deg' }],
            opacity: 0.4,
          }} />
        </View>
      );

    case 'target':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          <View style={{
            width: s * 0.65, height: s * 0.65,
            borderRadius: s * 0.325,
            borderWidth: s * 0.06, borderColor: color || COLORS.accent,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <View style={{
              width: s * 0.35, height: s * 0.35,
              borderRadius: s * 0.175,
              borderWidth: s * 0.05, borderColor: color || COLORS.accent,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <View style={{
                width: s * 0.12, height: s * 0.12,
                borderRadius: s * 0.06,
                backgroundColor: color || COLORS.accent,
              }} />
            </View>
          </View>
        </View>
      );

    case 'pointer':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          <View style={{
            width: s * 0.35, height: s * 0.6,
            backgroundColor: color || COLORS.textPrimary,
            borderTopLeftRadius: s * 0.18,
            borderTopRightRadius: s * 0.18,
            borderBottomLeftRadius: s * 0.08,
            borderBottomRightRadius: s * 0.08,
          }}>
            <View style={{
              position: 'absolute', top: s * 0.08, left: s * 0.08,
              width: s * 0.08, height: s * 0.12,
              backgroundColor: 'rgba(255,255,255,0.3)',
              borderRadius: s * 0.04,
            }} />
          </View>
        </View>
      );

    case 'shield':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          <View style={{
            width: s * 0.55, height: s * 0.65,
            backgroundColor: color || COLORS.info,
            borderTopLeftRadius: s * 0.08,
            borderTopRightRadius: s * 0.08,
            borderBottomLeftRadius: s * 0.15,
            borderBottomRightRadius: s * 0.15,
          }}>
            <View style={{
              position: 'absolute', top: s * 0.1, alignSelf: 'center',
              width: s * 0.2, height: s * 0.2,
              borderWidth: s * 0.04, borderColor: 'rgba(255,255,255,0.4)',
              borderRadius: s * 0.1,
            }} />
          </View>
        </View>
      );

    case 'home':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          {/* Roof */}
          <View style={{
            width: 0, height: 0,
            borderBottomWidth: s * 0.3, borderBottomColor: color || COLORS.textSecondary,
            borderLeftWidth: s * 0.35, borderLeftColor: 'transparent',
            borderRightWidth: s * 0.35, borderRightColor: 'transparent',
          }} />
          {/* Body */}
          <View style={{
            width: s * 0.5, height: s * 0.3,
            backgroundColor: color || COLORS.textSecondary,
            marginTop: -s * 0.02,
          }}>
            {/* Door */}
            <View style={{
              position: 'absolute', bottom: 0, alignSelf: 'center',
              width: s * 0.15, height: s * 0.18,
              backgroundColor: COLORS.surface,
              borderTopLeftRadius: s * 0.03,
              borderTopRightRadius: s * 0.03,
            }} />
          </View>
        </View>
      );

    case 'back':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          <Text style={{
            fontSize: s * 0.8, lineHeight: s,
            color: color || COLORS.textPrimary,
            fontWeight: '300',
          }}>{'\u2039'}</Text>
        </View>
      );

    case 'gamepad':
      return (
        <View style={[iconStyles.center, { width: s, height: s }]}>
          <View style={{
            width: s * 0.7, height: s * 0.4,
            backgroundColor: color || COLORS.accent,
            borderRadius: s * 0.15,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: s * 0.1,
          }}>
            {/* D-pad */}
            <View>
              <View style={{ width: s * 0.06, height: s * 0.15, backgroundColor: COLORS.textPrimary, borderRadius: 1, position: 'absolute', left: s * 0.03, top: -s * 0.015 }} />
              <View style={{ width: s * 0.15, height: s * 0.06, backgroundColor: COLORS.textPrimary, borderRadius: 1, position: 'absolute', top: s * 0.03 }} />
            </View>
            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: s * 0.04 }}>
              <View style={{ width: s * 0.08, height: s * 0.08, borderRadius: s * 0.04, backgroundColor: COLORS.accentGold }} />
              <View style={{ width: s * 0.08, height: s * 0.08, borderRadius: s * 0.04, backgroundColor: COLORS.info }} />
            </View>
          </View>
        </View>
      );

    default:
      return <View style={{ width: s, height: s }} />;
  }
};

const MedalIcon: React.FC<{ size: number; color: string; borderColor: string }> = ({ size: s, color, borderColor }) => (
  <View style={[iconStyles.center, { width: s, height: s }]}>
    {/* Ribbon */}
    <View style={{ flexDirection: 'row', marginBottom: -s * 0.04 }}>
      <View style={{ width: s * 0.15, height: s * 0.2, backgroundColor: COLORS.accent, transform: [{ rotate: '-15deg' }] }} />
      <View style={{ width: s * 0.15, height: s * 0.2, backgroundColor: COLORS.info, transform: [{ rotate: '15deg' }], marginLeft: -s * 0.04 }} />
    </View>
    {/* Medal circle */}
    <View style={{
      width: s * 0.5, height: s * 0.5,
      borderRadius: s * 0.25,
      backgroundColor: color,
      borderWidth: s * 0.05, borderColor,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 4,
    }}>
      <View style={{
        width: s * 0.12, height: s * 0.12,
        backgroundColor: borderColor,
        transform: [{ rotate: '45deg' }],
      }} />
    </View>
  </View>
);

const iconStyles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
