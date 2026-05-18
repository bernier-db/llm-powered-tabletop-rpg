// @ts-check
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

/** @type {import('eslint').Linter.Config[]} */
const config = [
  // ── Ignore generated / third-party output ──────────────────────────────
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },

  // ── TypeScript source files ─────────────────────────────────────────────
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // ── Core TS rules ───────────────────────────────────────────────────
      ...tsPlugin.configs['recommended'].rules,
      ...tsPlugin.configs['recommended-requiring-type-checking'].rules,

      // Prefer `satisfies` over `as unknown as` casts
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        {
          assertionStyle: 'as',
          objectLiteralTypeAssertions: 'allow-as-parameter',
        },
      ],
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-as-const': 'error',

      // Keep imports clean
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',

      // Strictness
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/require-await': 'error',

      // Disallow `console` in src/ by default (overridden for cli/ below)
      'no-console': 'error',

      // General quality
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
    },
  },

  // ── CLI subtree: console.log is expected ────────────────────────────────
  {
    files: ['src/cli/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // ── Test files: relax a few strict rules ────────────────────────────────
  {
    files: ['tests/**/*.ts', 'src/**/*.test.ts'],
    rules: {
      // Tests often assert on opaque shapes
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      // console.log is fine in test helpers
      'no-console': 'off',
    },
  },

  // ── Config files (vitest.config.ts, eslint.config.js, etc.) ────────────
  {
    files: ['*.config.ts', '*.config.js', '*.config.cjs'],
    languageOptions: {
      parserOptions: {
        // No project needed for plain config files
        project: null,
      },
    },
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  },
];

export default config;
