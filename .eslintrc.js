module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: ['airbnb-base'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'import/extensions': 'off',
    'lines-between-class-members': [
      'error',
      'always',
      { exceptAfterSingleLine: true },
    ],
    'default-case': 'off',
    'max-len': 'off',
    'no-underscore-dangle': 'off',
    'no-dupe-class-members': 'off',
    'function-paren-newline': 'off',
    'function-call-argument-newline': 'off',
    'default-param-last': 'off',
    'no-redeclare': 'off',
    '@typescript-eslint/no-redeclare': ['error'],
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
};
