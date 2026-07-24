const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', 'coverage/**', 'store-assets/**'],
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
