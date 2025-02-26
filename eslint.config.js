// eslint.config.js
import js from '@eslint/js'
import ts from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import prettier from 'eslint-plugin-prettier'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import globals from 'globals'

/** @type {import('eslint').FlatConfig[]} */
export default [
  {
    ignores: ['**/node_modules/', '/.cache', '/build', '/.idea', 'examples/*'],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 'latest',
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      '@typescript-eslint': ts,
      prettier,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      ...ts.configs.recommended.rules,
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: ['interface', 'class', 'typeAlias', 'enum'],
          format: ['PascalCase'],
        },
        {
          selector: ['enumMember'],
          format: ['UPPER_CASE'],
        },
      ],
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      curly: ['error', 'all'],
      'no-case-declarations': 'warn',
      'no-control-regex': 'warn',
      'no-empty': 'warn',
      'no-fallthrough': 'warn',
      'no-prototype-builtins': 'warn',
      'no-undef': 'error',
      'no-unused-vars': 'off',
      'no-useless-escape': 'warn',
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: 'block-like', next: '*' },
        { blankLine: 'any', prev: 'case', next: '*' },
      ],
      'prefer-const': 'warn',
      'prefer-spread': 'warn',
      'prettier/prettier': 'error',
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',
    },
  },
]
