import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Normalize EXPO_WEB_BASE_URL for Expo experiments.baseUrl.
 * `/` and empty mean root (desktop export and local web).
 * Pages uses `/where-ip`.
 */
function resolveWebBaseUrl(rawValue: string | undefined): string {
  if (rawValue === undefined || rawValue === '' || rawValue === '/') {
    return '';
  }

  const withLeadingSlash = rawValue.startsWith('/')
    ? rawValue
    : `/${rawValue}`;
  return withLeadingSlash.endsWith('/')
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

function readPackageVersion(): string {
  // Expo evaluates app.config with CommonJS interop; avoid node: builtins so
  // the app TypeScript project does not need @types/node.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const packageJson = require('./package.json') as { version: string };
  return packageJson.version;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const webBaseUrl = resolveWebBaseUrl(process.env.EXPO_WEB_BASE_URL);

  return {
    ...config,
    name: 'WhereIP',
    slug: 'where-ip',
    owner: 'el-mowja-studio',
    description:
      'A free, open-source view of your public IP and approximate network location.',
    version: readPackageVersion(),
    orientation: 'default',
    icon: './assets/images/app-icon.png',
    scheme: 'whereip',
    userInterfaceStyle: 'automatic',
    backgroundColor: '#F4F8FC',
    githubUrl: 'https://github.com/itsryanthedev/where-ip',
    runtimeVersion: {
      policy: 'appVersion',
    },
    ios: {
      bundleIdentifier: 'com.elmowjastudio.whereip',
      buildNumber: '3',
      icon: './assets/images/app-icon.png',
      supportsTablet: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.elmowjastudio.whereip',
      versionCode: 3,
      allowBackup: false,
      blockedPermissions: [
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.SYSTEM_ALERT_WINDOW',
      ],
      adaptiveIcon: {
        backgroundColor: '#0B84F3',
        foregroundImage: './assets/images/android-icon-foreground.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: true,
    },
    web: {
      output: 'static',
      favicon: './public/favicon-96x96.png',
      bundler: 'metro',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#0B84F3',
          image: './assets/images/splash-icon.png',
          imageWidth: 176,
          dark: {
            backgroundColor: '#071B2C',
            image: './assets/images/splash-icon.png',
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
      ...(webBaseUrl ? { baseUrl: webBaseUrl } : {}),
    },
  };
};
