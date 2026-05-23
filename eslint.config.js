/* eslint-disable */
const js = require('@eslint/js');
const ts = require('typescript-eslint');
const prettier = require('eslint-config-prettier');

module.exports = ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.ir_storage/**']
  }
);
