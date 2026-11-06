import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/build/**', '**/node_modules/**', '**/test-results/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'jsx-a11y': jsxA11y,
      'react-hooks': reactHooks,
    },
    rules: {
      ...jsxA11y.flatConfigs?.recommended?.rules,
      ...reactHooks.configs['recommended-latest'].rules,
      // Named scrollable regions (the five-lane Planning board) need keyboard focus to scroll.
      'jsx-a11y/no-noninteractive-tabindex': ['error', { roles: ['region', 'tabpanel'] }],
      // Forge V2 form controls wrap a native element; treat them as the control a label points at.
      'jsx-a11y/label-has-associated-control': [
        'error',
        { controlComponents: ['SelectV2', 'TextInputV2', 'CheckboxV2', 'SwitchV2'], depth: 3 },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/set-state-in-effect': 'error',
    },
  },
  {
    files: ['tooling/**/*.mjs', 'packages/**/scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        URL: 'readonly',
        console: 'readonly',
        getComputedStyle: 'readonly',
        process: 'readonly',
      },
    },
  },
  prettier,
);
