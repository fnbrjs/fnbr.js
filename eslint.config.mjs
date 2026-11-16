import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import { importX } from 'eslint-plugin-import-x';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['dist/**']),
  {
    files: ['**/*.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      stylistic.configs.customize({
        indent: 2,
        quotes: 'single',
        semi: true,
        jsx: false,
      }),
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
    ],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
      '@stylistic/list-style': 'off',
      '@stylistic/max-len': ['error', { code: 150 }],
      '@stylistic/multiline-ternary': 'off',
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxBOF: 0, maxEOF: 0 }],
      '@stylistic/operator-linebreak': 'off',
      '@stylistic/padded-blocks': ['error', 'never'],
      '@stylistic/quote-props': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],
      'import-x/order': ['error', {
        groups: [['builtin', 'external'], ['internal', 'parent', 'sibling', 'index', 'object'], 'type'],
        'newlines-between': 'never',
      }],
      'no-restricted-syntax': 'off',
      'no-promise-executor-return': 'off',
      'default-case': 'off',
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({ project: './tsconfig.eslint.json' }),
      ],
    },
  },
);
