import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import Head from 'expo-router/head';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { DisclosureDialog } from '@/components/disclosure-dialog';
import { darkColors, lightColors } from '@/constants/theme';
import {
  useWhereIp,
  WhereIpProvider,
} from '@/providers/where-ip-provider';
import { withWebBaseUrl } from '@/utils/web-base-url';

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({
  duration: 350,
  fade: true,
});

function RootNavigator() {
  const colorScheme = useColorScheme();
  const effectiveColorScheme =
    process.env.EXPO_OS === 'web' ? 'light' : colorScheme;
  const colors = effectiveColorScheme === 'dark' ? darkColors : lightColors;
  const { isReady } = useWhereIp();

  useEffect(() => {
    if (isReady) {
      SplashScreen.hide();
    }
  }, [isReady]);

  const screenOptions = useMemo(
    () => ({
      headerBackButtonDisplayMode: 'minimal' as const,
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: colors.background,
      },
      headerTitleStyle: {
        fontWeight: '700' as const,
      },
      headerTintColor: colors.text,
      contentStyle: {
        backgroundColor: colors.background,
      },
    }),
    [colors.background, colors.text],
  );

  return (
    <ThemeProvider
      value={effectiveColorScheme === 'dark' ? DarkTheme : DefaultTheme}
    >
      <StatusBar style={effectiveColorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" options={{ title: 'WhereIP' }} />
        <Stack.Screen
          name="about"
          options={{
            title: 'About & Privacy',
            presentation: 'formSheet',
            sheetAllowedDetents: [0.85, 1],
            sheetGrabberVisible: true,
          }}
        />
        <Stack.Screen name="privacy" options={{ title: 'Privacy Policy' }} />
      </Stack>
      <DisclosureDialog />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <>
      {process.env.EXPO_OS === 'web' ? (
        <Head>
          <title>WhereIP — Your public connection, clearly</title>
          <style>{`
            html {
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
          `}</style>
          <meta
            name="description"
            content="A free, open-source view of your public IP and approximate network location."
          />
          <meta name="theme-color" content="#0B84F3" />
          <meta property="og:type" content="website" />
          <meta property="og:title" content="WhereIP" />
          <meta
            property="og:description"
            content="Know what the internet sees. Free, open source, and privacy first."
          />
          <meta
            property="og:image"
            content={withWebBaseUrl('/og-image.png')}
          />
          <meta name="twitter:card" content="summary_large_image" />
          <link
            rel="icon"
            type="image/svg+xml"
            href={withWebBaseUrl('/favicon.svg')}
          />
          <link
            rel="icon"
            type="image/png"
            href={withWebBaseUrl('/favicon-96x96.png')}
            sizes="96x96"
          />
          <link
            rel="shortcut icon"
            href={withWebBaseUrl('/favicon.ico')}
          />
          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href={withWebBaseUrl('/apple-touch-icon.png')}
          />
          <link
            rel="manifest"
            href={withWebBaseUrl('/site.webmanifest')}
          />
        </Head>
      ) : null}
      <WhereIpProvider>
        <RootNavigator />
      </WhereIpProvider>
    </>
  );
}
