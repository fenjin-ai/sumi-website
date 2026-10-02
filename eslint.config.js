import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/**',
      'reports/**',
      'resources/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '.tools/**',
      '.venv/**',
    ],
  },
  js.configs.recommended,
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    languageOptions: { globals: globals.node },
    rules: {
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'no-alert': 'error',
      'no-console': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-implicit-coercion': 'error',
      'no-param-reassign': 'error',
      'no-return-assign': 'error',
      'no-throw-literal': 'error',
      'no-unneeded-ternary': 'error',
      'no-unused-vars': [
        'error',
        { args: 'all', argsIgnorePattern: '^_', caughtErrors: 'all' },
      ],
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-const': 'error',
      'prefer-object-spread': 'error',
      'prefer-promise-reject-errors': 'error',
      radix: 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='only']",
          message: 'Do not commit focused tests.',
        },
      ],
    },
  },
  {
    files: ['assets/js/**/*.js', 'tests/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
];
