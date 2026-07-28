const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const reactYouMightNotNeedAnEffect = require('eslint-plugin-react-you-might-not-need-an-effect');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', 'coverage/**', 'store-assets/**'],
  },
  // Catch unnecessary Effects (https://react.dev/learn/you-might-not-need-an-effect).
  reactYouMightNotNeedAnEffect.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      // React Compiler / hooks quality beyond expo's base recommended set.
      'react-hooks/no-deriving-state-in-effects': 'error',
      'react-hooks/void-use-memo': 'error',
      // Prefer ternary over && so `0` / `''` don't leak into the tree.
      'react/jsx-no-leaked-render': 'warn',
    },
  },
  {
    files: ['scripts/**/*.{js,mjs}'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        afterEach: 'readonly',
        beforeEach: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
        test: 'readonly',
      },
    },
  },
]);
