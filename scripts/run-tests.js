#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('Starting tests...');

const jestProcess = spawn('npx', [
  'jest',
  '--ci',
  '--coverage', 
  '--watchAll=false',
  '--forceExit',
  '--detectOpenHandles',
  '--maxWorkers=2',
  '--verbose'
], {
  stdio: 'inherit',
  env: process.env
});

// Set a hard timeout
const timeout = setTimeout(() => {
  console.log('❌ Tests timed out after 4 minutes, forcing exit...');
  jestProcess.kill('SIGKILL');
  process.exit(1);
}, 4 * 60 * 1000); // 4 minutes

jestProcess.on('close', (code) => {
  clearTimeout(timeout);
  console.log(`✅ Tests completed with code: ${code}`);
  
  // Force exit after a brief delay
  setTimeout(() => {
    process.exit(code);
  }, 1000);
});

jestProcess.on('error', (error) => {
  clearTimeout(timeout);
  console.error('❌ Test process error:', error);
  process.exit(1);
});
