module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended'
  ],
  plugins: ['@typescript-eslint'],
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
    
    // Require semicolons
    '@typescript-eslint/semi': ['error', 'always'],
    
    // Enforce consistent spacing
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    
    // Enforce consistent quotes
    'quotes': ['error', 'single', { 'avoidEscape': true }],
    
    // No unused variables (but allow unused function parameters with underscore prefix)
    '@typescript-eslint/no-unused-vars': ['error', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_'
    }],
    
    // Enforce consistent interface naming
    '@typescript-eslint/naming-convention': [
      'error',
      {
        'selector': 'interface',
        'format': ['PascalCase']
      }
    ]
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'coverage/',
    '*.js'
  ]
};
