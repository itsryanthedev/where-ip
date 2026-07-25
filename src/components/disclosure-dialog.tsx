import { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ActionButton } from '@/components/action-button';
import { AppLogo } from '@/components/app-logo';
import { ExternalLink } from '@/components/external-link';
import { RevealView } from '@/components/reveal-view';
import { APP_LINK_IDS, APP_LINKS, providerLinkId } from '@/constants/links';
import { PROVIDERS } from '@/constants/providers';
import { motion, radii, shadows, spacing } from '@/constants/theme';
import { useAppColors } from '@/hooks/use-app-colors';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useWhereIp } from '@/providers/where-ip-provider';

export function DisclosureDialog() {
  const colors = useAppColors();
  const reduceMotion = useReducedMotion();
  const { acknowledgementRequired, acceptDisclosure } = useWhereIp();
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async () => {
    setSubmitting(true);
    await acceptDisclosure().finally(() => setSubmitting(false));
  };

  return (
    <Modal
      animationType={reduceMotion ? 'none' : 'fade'}
      transparent
      visible={acknowledgementRequired}
      onRequestClose={() => undefined}
    >
      {acknowledgementRequired ? (
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <RevealView
            accessibilityViewIsModal
            duration={motion.duration.dialog}
            fromScale={motion.scale.surfaceEnter}
            style={[
              styles.dialog,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                boxShadow: `${shadows.dialog} ${colors.shadow}`,
              },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.logoRow}>
                <AppLogo size={64} />
                <View style={styles.headingGroup}>
                  <Text style={[styles.eyebrow, { color: colors.accentText }]}>
                    Before the first lookup
                  </Text>
                  <Text
                    accessibilityRole="header"
                    style={[styles.title, { color: colors.text }]}
                  >
                    Privacy, in plain language
                  </Text>
                </View>
              </View>

              <Text selectable style={[styles.body, { color: colors.textMuted }]}>
                WhereIP is free and open source. It has no account, ads, analytics,
                or tracking SDKs.
              </Text>
              <Text selectable style={[styles.body, { color: colors.textMuted }]}>
                To show your public IP and approximate IP-based location, your
                device contacts ipwho.is directly. If it is unavailable, WhereIP
                may try FreeIPAPI and then IPinfo. Every contacted provider
                necessarily receives your public IP and applies its own policies.
              </Text>
              <Text selectable style={[styles.body, { color: colors.textMuted }]}>
                WhereIP operates no backend and receives none of your lookup data.
                A short-lived result is stored only on this device to reduce
                requests. No GPS permission is requested.
              </Text>

              <View
                style={[
                  styles.providerLinks,
                  {
                    backgroundColor: colors.surfaceRaised,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.providerHeading, { color: colors.text }]}>
                  Third-party policies
                </Text>
                {PROVIDERS.map((provider) => (
                  <View key={provider.id} style={styles.providerRow}>
                    <Text style={[styles.providerName, { color: colors.textMuted }]}>
                      {provider.name}
                    </Text>
                    <View style={styles.inlineLinks}>
                      <ExternalLink
                        compact
                        href={provider.privacyUrl}
                        linkId={providerLinkId(provider.id, 'privacy')}
                        label={`${provider.name} Privacy Policy`}
                      />
                      <ExternalLink
                        compact
                        href={provider.termsUrl}
                        linkId={providerLinkId(provider.id, 'terms')}
                        label={`${provider.name} Terms of Use`}
                      />
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.actions}>
                <ActionButton
                  label="Acknowledge and continue"
                  loading={submitting}
                  onPress={() => void handleContinue()}
                />
                <ExternalLink
                  href={APP_LINKS.repository}
                  linkId={APP_LINK_IDS.repository}
                  label="View source on GitHub"
                />
              </View>
            </ScrollView>
          </RevealView>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '92%',
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: radii.hero,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  headingGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  providerLinks: {
    borderWidth: 1,
    borderRadius: radii.card,
    borderCurve: 'continuous',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  providerHeading: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
  },
  providerRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  inlineLinks: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
});
