module.exports = {
  env: {
    node: true,
    es2020: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  rules: {
    // Allow console.log in source files since it's used for CLI output
    'no-console': 'off',
    
    // Prefer const over let when possible
    'prefer-const': 'error',
    
    // Allow unused variables for now (common in TypeScript)
    'no-unused-vars': 'off',
    
    // Allow undefined variables (TypeScript will catch these)
    'no-undef': 'off'
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'coverage/',
    '*.js'
  ]
};
