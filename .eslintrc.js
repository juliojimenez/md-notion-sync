module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  env: {
    node: true,
    es2020: true,
    jest: true
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  rules: {
    // Allow console.log in source files since it's used for CLI output
    'no-console': 'off',
    
    // Allow any types for Notion API compatibility
    '@typescript-eslint/no-explicit-any': 'off',
    
    // Allow non-null assertions for cases where we know values exist
    '@typescript-eslint/no-non-null-assertion': 'off',
    
    // Prefer const over let when possible
    'prefer-const': 'error',
    
    // No unused variables (but allow unused function parameters with underscore prefix)
    '@typescript-eslint/no-unused-vars': ['error', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_'
    }],
    
    // Disable base rule as it can report incorrect errors
    'no-unused-vars': 'off',
    
    // Allow require() in test files and build scripts
    '@typescript-eslint/no-var-requires': 'off'
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'coverage/',
    '*.js',
    '.eslintrc.js',
    'jest.config.js'
  ]
};
