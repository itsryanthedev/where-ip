import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ActionButton } from '@/components/action-button';
import { RefreshIcon } from '@/components/icons';
import { REFRESH_COOLDOWN_MS } from '@/constants/providers';
import { spacing } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';
import { formatCountdown } from '@/utils/ip';

type RefreshCountdownProps = {
  cooldownRemainingMs: number;
  loading: boolean;
  onRefresh: () => void;
};

const size = 64;
const strokeWidth = 6;
const radius = (size - strokeWidth) / 2;
const circumference = 2 * Math.PI * radius;

export function RefreshCountdown({
  cooldownRemainingMs,
  loading,
  onRefresh,
}: RefreshCountdownProps) {
  const colors = useAppColors();
  const progress = Math.min(1, cooldownRemainingMs / REFRESH_COOLDOWN_MS);
  const disabled = loading || cooldownRemainingMs > 0;

  return (
    <View style={styles.container}>
      <View
        accessible
        accessibilityRole="timer"
        accessibilityLabel={
          loading
            ? 'Refreshing network information'
            : cooldownRemainingMs > 0
              ? `Refresh available in ${formatCountdown(cooldownRemainingMs)}`
              : 'Refresh is available'
        }
        style={styles.ring}
      >
        <Svg width={size} height={size} style={styles.svg}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.border}
            strokeWidth={strokeWidth}
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.accent}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View
          style={[
            styles.ringContent,
            { backgroundColor: colors.surfaceRaised },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.accent} size="small" />
          ) : (
            <Text
              style={[
                styles.countdown,
                { color: cooldownRemainingMs > 0 ? colors.text : colors.mint },
              ]}
            >
              {cooldownRemainingMs > 0
                ? formatCountdown(cooldownRemainingMs)
                : 'Ready'}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.copy}>
        <Text style={[styles.heading, { color: colors.text }]}>
          {loading
            ? 'Checking your connection…'
            : cooldownRemainingMs > 0
              ? 'Next refresh'
              : 'Refresh available'}
        </Text>
        <Text style={[styles.description, { color: colors.textMuted }]}>
          Results are cached and refreshes are rate-limited across all providers.
        </Text>
      </View>

      <ActionButton
        accessibilityHint="Requests fresh IP information from the selected provider"
        disabled={disabled}
        icon={<RefreshIcon color="#FFFFFF" />}
        label="Refresh"
        onPress={onRefresh}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  ring: {
    width: size,
    height: size,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  ringContent: {
    width: size - strokeWidth * 2,
    height: size - strokeWidth * 2,
    borderRadius: (size - strokeWidth * 2) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdown: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  copy: {
    flex: 1,
    minWidth: 180,
    gap: spacing.xs,
  },
  heading: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    minWidth: 120,
  },
});
