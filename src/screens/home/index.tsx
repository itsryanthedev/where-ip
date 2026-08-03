import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Link, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ActionButton } from '@/components/action-button';
import { AppLogo } from '@/components/app-logo';
import { DetailCard } from '@/components/detail-card';
import { CopyIcon, InfoIcon } from '@/components/icons';
import { ProviderSelector } from '@/components/provider-selector';
import { RefreshCountdown } from '@/components/refresh-countdown';
import { RevealView } from '@/components/reveal-view';
import { TactilePressable } from '@/components/tactile-pressable';
import { getProvider } from '@/constants/providers';
import {
  contentMaxWidth,
  motion,
  radii,
  shadows,
  spacing,
} from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useCooldownRemainingMs } from '@/hooks/use-cooldown-remaining-ms';
import { useWhereIp } from '@/providers/where-ip-provider';
import type { ProviderId } from '@/types/ip';
import {
  countryCodeToFlag,
  formatLocation,
  formatLocationMeta,
  formatTimezoneLocalTime,
  formatLookupTime,
} from '@/utils/ip';

function HomeHeaderAboutButton() {
  const colors = useAppColors();

  return (
    <Link href="/about" asChild>
      <TactilePressable
        accessibilityRole="button"
        accessibilityLabel="About WhereIP and privacy"
        accessibilityHint="Opens how lookups work, provider choice, and source links"
        style={({ pressed }) => [
          styles.headerButton,
          {
            backgroundColor: pressed
              ? colors.accentSoft
              : 'transparent',
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <InfoIcon color={colors.accent} size={25} />
      </TactilePressable>
    </Link>
  );
}

function TimezoneDetailCard({ timezone }: { timezone?: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!timezone) {
      return;
    }

    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, [timezone]);

  const localTime = formatTimezoneLocalTime(timezone, now);

  return (
    <DetailCard
      label="Timezone"
      supportingText={localTime}
      value={timezone ?? 'Unavailable'}
    />
  );
}

export function Home() {
  const colors = useAppColors();
  const { isCompact, isTabletOrLarger, width } = useBreakpoint();
  const {
    isReady,
    result,
    status,
    errorMessage,
    fallbackFrom,
    preferredProvider,
    setPreferredProvider,
    providerSwitchTarget,
    providerSwitchRefreshing,
    refresh,
  } = useWhereIp();
  const cooldownRemainingMs = useCooldownRemainingMs(result?.fetchedAt);
  const providerSwitchRemainingMs = providerSwitchTarget
    ? cooldownRemainingMs
    : 0;
  const [copied, setCopied] = useState(false);
  const copiedResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isLoading = status === 'loading' || status === 'refreshing';
  const provider = result ? getProvider(result.providerId) : null;
  const showMarketingHero = !result;
  const useSplitHero = isTabletOrLarger;
  const ipAddressFontSize = isCompact ? 29 : width < 900 ? 34 : 42;

  useEffect(() => {
    return () => {
      if (copiedResetTimerRef.current) {
        clearTimeout(copiedResetTimerRef.current);
      }
    };
  }, []);

  const copyIp = async () => {
    if (!result) {
      return;
    }
    await Clipboard.setStringAsync(result.ip);
    if (process.env.EXPO_OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setCopied(true);
    if (copiedResetTimerRef.current) {
      clearTimeout(copiedResetTimerRef.current);
    }
    copiedResetTimerRef.current = setTimeout(() => {
      setCopied(false);
      copiedResetTimerRef.current = null;
    }, 1800);
  };

  const shareResult = async () => {
    if (!result) {
      return;
    }
    const location = formatLocation(result.city, result.region, result.countryName);
    await Share.share({
      message: `Public IP: ${result.ip}\nApproximate location: ${location}\nChecked with WhereIP.`,
    });
  };

  const selectProvider = async (providerId: ProviderId) => {
    if (providerId === preferredProvider) {
      return;
    }

    await setPreferredProvider(providerId);
    if (process.env.EXPO_OS === 'ios') {
      await Haptics.selectionAsync();
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'WhereIP',
          headerRight: () => <HomeHeaderAboutButton />,
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: isCompact ? spacing.lg : spacing.xl },
        ]}
        style={{ backgroundColor: colors.background }}
      >
        <View
          style={[
            styles.backgroundOrb,
            {
              backgroundColor: colors.backgroundAccent,
              borderColor: colors.accentSoft,
            },
          ]}
        />
        <View style={styles.content}>
          {showMarketingHero ? (
            <View style={styles.hero}>
              <AppLogo size={isCompact ? 78 : 92} />
              <View
                style={[
                  styles.heroCopy,
                  isCompact ? styles.heroCopyCompact : null,
                ]}
              >
                <Text style={[styles.eyebrow, { color: colors.accentText }]}>
                  Your public connection
                </Text>
                <Text
                  accessibilityRole="header"
                  style={[
                    styles.heroTitle,
                    {
                      color: colors.text,
                      fontSize: isCompact ? 30 : 38,
                      letterSpacing: isCompact ? -0.7 : -1.1,
                      lineHeight: isCompact ? 36 : 44,
                    },
                  ]}
                >
                  Know what the internet sees.
                </Text>
                <Text style={[styles.heroDescription, { color: colors.textMuted }]}>
                  One clear, privacy-first view of your public IP and approximate
                  network location.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.compactBrand}>
              <AppLogo size={44} />
              <Text
                accessibilityRole="header"
                style={[styles.compactBrandTitle, { color: colors.text }]}
              >
                WhereIP
              </Text>
            </View>
          )}

          {!isReady || (status === 'loading' && !result) ? (
            <View
              accessible
              accessibilityLiveRegion="polite"
              style={[
                styles.loadingCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  boxShadow: `${shadows.card} ${colors.shadow}`,
                },
              ]}
            >
              <ActivityIndicator color={colors.accent} size="large" />
              <Text style={[styles.loadingTitle, { color: colors.text }]}>
                Checking your public connection…
              </Text>
              <Text style={[styles.loadingDescription, { color: colors.textMuted }]}>
                ipwho.is is tried first. A fallback is used only if needed.
              </Text>
            </View>
          ) : result ? (
            <>
              <RevealView
                duration={motion.duration.content}
                fromTranslateY={motion.offset.content}
                style={[
                  styles.ipCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    boxShadow: `${shadows.hero} ${colors.shadow}`,
                  },
                ]}
              >
                <View style={styles.ipTopRow}>
                  <View
                    accessible
                    accessibilityRole="text"
                    accessibilityLabel={
                      status === 'success'
                        ? 'Result is up to date from the latest check'
                        : 'Showing a result saved on this device'
                    }
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          status === 'success' ? colors.mintSoft : colors.warningSoft,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            status === 'success' ? colors.mint : colors.warning,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            status === 'success' ? colors.mint : colors.warning,
                        },
                      ]}
                    >
                      {status === 'success'
                        ? 'Up to date'
                        : 'Saved on this device'}
                    </Text>
                  </View>
                  <Text
                    style={styles.flag}
                    accessibilityLabel={
                      result.countryName ?? result.countryCode
                    }
                  >
                    {countryCodeToFlag(result.countryCode)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.heroBody,
                    useSplitHero ? styles.heroBodySplit : styles.heroBodyStacked,
                  ]}
                >
                  <View
                    style={[
                      styles.ipSummary,
                      useSplitHero ? null : styles.ipSummaryStacked,
                    ]}
                  >
                    <Text style={[styles.ipLabel, { color: colors.textMuted }]}>
                      PUBLIC IP ADDRESS
                    </Text>
                    <Text
                      selectable
                      adjustsFontSizeToFit
                      minimumFontScale={0.62}
                      numberOfLines={1}
                      style={[
                        styles.ipAddress,
                        {
                          color: colors.text,
                          fontSize: ipAddressFontSize,
                          lineHeight: isCompact ? 38 : 44,
                        },
                      ]}
                    >
                      {result.ip}
                    </Text>

                    <View style={styles.ipActions}>
                      <ActionButton
                        icon={<CopyIcon color={colors.onAccent} />}
                        label={copied ? 'Copied' : 'Copy IP'}
                        onPress={() => void copyIp()}
                        style={
                          isCompact
                            ? { ...styles.ipAction, ...styles.ipActionCompact }
                            : styles.ipAction
                        }
                      />
                      <ActionButton
                        label="Share"
                        onPress={() => void shareResult()}
                        style={
                          isCompact
                            ? { ...styles.ipAction, ...styles.ipActionCompact }
                            : styles.ipAction
                        }
                        variant="secondary"
                      />
                    </View>
                  </View>

                  <DetailCard
                    label="Approximate location"
                    supportingText="Estimated from your public IP — never GPS."
                    metaText={formatLocationMeta(
                      result.postalCode,
                      result.latitude,
                      result.longitude,
                    )}
                    style={[
                      styles.heroLocationCard,
                      {
                        backgroundColor: colors.surfaceRaised,
                        borderColor: colors.border,
                        boxShadow: 'none',
                      },
                      useSplitHero
                        ? styles.heroLocationCardSplit
                        : styles.heroLocationCardStacked,
                    ]}
                    value={formatLocation(
                      result.city,
                      result.region,
                      result.countryName ?? result.countryCode,
                    )}
                  />
                </View>

                <View
                  style={[
                    styles.providerLine,
                    { borderTopColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.providerText,
                      isCompact ? styles.providerTextCompact : null,
                      { color: colors.textMuted },
                    ]}
                  >
                    Checked {formatLookupTime(result.fetchedAt)} via{' '}
                    <Text style={{ color: colors.text, fontWeight: '700' }}>
                      {provider?.name}
                    </Text>
                  </Text>
                  <ProviderSelector
                    selectedProvider={preferredProvider}
                    onSelect={(providerId) => void selectProvider(providerId)}
                    providerSwitchTarget={providerSwitchTarget}
                    providerSwitchRefreshing={providerSwitchRefreshing}
                    providerSwitchRemainingMs={providerSwitchRemainingMs}
                  />
                </View>
              </RevealView>

              {fallbackFrom ? (
                <RevealView
                  accessibilityLiveRegion="polite"
                  duration={motion.duration.popover}
                  fromTranslateY={motion.offset.popover}
                  style={[
                    styles.notice,
                    {
                      backgroundColor: colors.warningSoft,
                      borderColor: colors.warning,
                    },
                  ]}
                >
                  <Text style={[styles.noticeText, { color: colors.warning }]}>
                    {getProvider(fallbackFrom).name} was unavailable, so{' '}
                    {provider?.name} supplied this result.
                  </Text>
                </RevealView>
              ) : null}

              {errorMessage ? (
                <RevealView
                  accessibilityLiveRegion="assertive"
                  duration={motion.duration.popover}
                  fromTranslateY={motion.offset.popover}
                  style={[
                    styles.notice,
                    {
                      backgroundColor: colors.dangerSoft,
                      borderColor: colors.danger,
                    },
                  ]}
                >
                  <Text selectable style={[styles.noticeText, { color: colors.danger }]}>
                    {errorMessage}
                  </Text>
                </RevealView>
              ) : null}

              <RevealView
                duration={motion.duration.content}
                fromTranslateY={motion.offset.content}
                style={styles.detailGrid}
              >
                <TimezoneDetailCard timezone={result.timezone} />
                <View
                  style={[
                    styles.refreshCard,
                    isCompact ? styles.refreshCardCompact : null,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      boxShadow: `${shadows.card} ${colors.shadow}`,
                    },
                  ]}
                >
                  <RefreshCountdown
                    cooldownRemainingMs={cooldownRemainingMs}
                    loading={isLoading}
                    onRefresh={() => void refresh()}
                    variant="card"
                  />
                </View>
              </RevealView>

              <RevealView
                duration={motion.duration.content}
                fromTranslateY={motion.offset.content}
                style={styles.detailGrid}
              >
                <DetailCard
                  label="Network"
                  supportingText={
                    result.asn
                      ? `Network ID ${result.asn}`
                      : 'Network ID unavailable'
                  }
                  value={result.organization ?? result.isp ?? 'Unavailable'}
                />
                <DetailCard
                  label="Connection"
                  supportingText="Internet Protocol version from the provider"
                  value={`IPv${result.ipVersion}`}
                />
              </RevealView>
            </>
          ) : (
            <View
              style={[
                styles.loadingCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.loadingTitle, { color: colors.text }]}>
                Unable to check your connection
              </Text>
              <Text selectable style={[styles.loadingDescription, { color: colors.textMuted }]}>
                {errorMessage ?? 'Check your internet connection and try again.'}
              </Text>
              <ActionButton
                label="Try again"
                loading={isLoading}
                onPress={() => void refresh()}
              />
            </View>
          )}

          <Text style={[styles.footer, { color: colors.textMuted }]}>
            No account · No ads · No analytics · Open source
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  scrollContent: {
    minHeight: '100%',
    paddingTop: spacing.xl,
    paddingBottom: spacing.hero,
    overflow: 'hidden',
  },
  backgroundOrb: {
    pointerEvents: 'none',
    position: 'absolute',
    top: -180,
    right: -160,
    width: 480,
    height: 480,
    borderRadius: 240,
    borderWidth: 42,
    opacity: 0.8,
  },
  content: {
    width: '100%',
    maxWidth: contentMaxWidth,
    alignSelf: 'center',
    gap: spacing.xl,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xl,
    paddingVertical: spacing.lg,
  },
  compactBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  compactBrandTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  heroCopy: {
    flex: 1,
    minWidth: 240,
    gap: spacing.sm,
  },
  heroCopyCompact: {
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontWeight: '800',
  },
  heroDescription: {
    maxWidth: 620,
    fontSize: 17,
    lineHeight: 25,
  },
  loadingCard: {
    minHeight: 300,
    borderWidth: 1,
    borderRadius: radii.section,
    borderCurve: 'continuous',
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  loadingTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  loadingDescription: {
    maxWidth: 500,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  ipCard: {
    zIndex: 1,
    borderWidth: 1,
    borderRadius: radii.hero,
    borderCurve: 'continuous',
    padding: spacing.xl,
    gap: spacing.md,
  },
  ipTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  flag: {
    fontSize: 34,
    lineHeight: 42,
  },
  ipLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  ipAddress: {
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  heroBody: {
    gap: spacing.xl,
  },
  heroBodySplit: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  heroBodyStacked: {
    flexDirection: 'column',
  },
  ipSummary: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    gap: spacing.md,
  },
  ipSummaryStacked: {
    flexGrow: 0,
    flexBasis: 'auto',
  },
  heroLocationCard: {
    padding: spacing.xl,
  },
  heroLocationCardSplit: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 0,
  },
  heroLocationCardStacked: {
    flexGrow: 0,
    flexBasis: 'auto',
    width: '100%',
    minHeight: 0,
  },
  ipActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  ipAction: {
    minWidth: 136,
  },
  ipActionCompact: {
    minWidth: 0,
    flexGrow: 1,
  },
  providerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.sm,
    paddingTop: spacing.lg,
  },
  providerText: {
    minWidth: 210,
    flexGrow: 1,
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  providerTextCompact: {
    minWidth: 0,
  },
  notice: {
    borderWidth: 1,
    borderRadius: radii.control,
    borderCurve: 'continuous',
    padding: spacing.lg,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  refreshCard: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 280,
    minWidth: 220,
    minHeight: 132,
    borderWidth: 1,
    borderRadius: radii.card,
    borderCurve: 'continuous',
    padding: spacing.lg,
  },
  refreshCardCompact: {
    minWidth: 0,
    flexBasis: '100%',
  },
  footer: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingTop: spacing.sm,
  },
});
