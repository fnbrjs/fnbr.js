module.exports = {
  env: {
    es2022: true,
    node: true,
  },
  extends: [
    'airbnb-base',
    'airbnb-typescript/base',
  ],
  parserOptions: {
    project: './tsconfig.eslint.json',
  },
  rules: {
    '@typescript-eslint/lines-between-class-members': [
      'error',
      'always',
      { exceptAfterSingleLine: true },
    ],
    '@typescript-eslint/consistent-type-imports': 'error',
    'import/order': ['error', {
      groups: [['builtin', 'external'], ['internal', 'parent', 'sibling', 'index', 'object'], 'type'],
      'newlines-between': 'never',
    }],
    'max-len': ['error', { code: 150 }],
    'no-restricted-syntax': 'off',
    'no-promise-executor-return': 'off',
    'default-case': 'off',
    'no-return-await': 'off',
    '@typescript-eslint/return-await': ['error', 'in-try-catch'],
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts'],
      },
    },
  },
};
