/**
 * Shared lint limits. Keep in sync with the other repos that use this block.
 * If a change trips a limit, split the code rather than disabling the rule.
 */
export const sharedRules = {
  complexity: ['error', 8],
  'max-lines': [
    'error',
    { max: 500, skipBlankLines: false, skipComments: false },
  ],
  'max-depth': ['error', 3],
  'max-params': ['error', 4],
  'max-nested-callbacks': ['error', 3],
  'no-console': ['error', { allow: ['warn', 'error'] }],
  eqeqeq: ['error', 'always', { null: 'ignore' }],
  'prefer-const': 'error',
  'no-var': 'error',
  'no-else-return': 'error',
  'no-nested-ternary': 'error',
  'no-unneeded-ternary': 'error',
  'object-shorthand': 'error',
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
  ],
}
