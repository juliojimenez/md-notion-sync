#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('🚀 Starting Jest tests with aggressive timeout...');

const jestProcess = spawn('npx', [
  'jest',
  '--ci',
  '--coverage', 
  '--watchAll=false',
  '--forceExit',
  '--detectOpenHandles',
  '--maxWorkers=1',
  '--runInBand',
  '--no-cache'
], {
  stdio: ['inherit', 'pipe', 'pipe'],
  env: process.env
});

// Log all output immediately
jestProcess.stdout.on('data', (data) => {
  process.stdout.write(data);
});

jestProcess.stderr.on('data', (data) => {
  process.stderr.write(data);
});

// Much more aggressive timeout - 2 minutes
const timeout = setTimeout(() => {
  console.log('\n❌ TIMEOUT: Killing Jest after 2 minutes...');
  jestProcess.kill('SIGKILL');
  setTimeout(() => {
    console.log('🔥 Force exiting process...');
    process.exit(124); // timeout exit code
  }, 2000);
}, 2 * 60 * 1000); // 2 minutes

jestProcess.on('close', (code) => {
  clearTimeout(timeout);
  console.log(`\n✅ Jest exited with code: ${code}`);
  
  // Immediate force exit
  process.exit(code || 0);
});

jestProcess.on('error', (error) => {
  clearTimeout(timeout);
  console.error('\n❌ Jest process error:', error);
  process.exit(1);
});

// Backup timeout in case everything fails
setTimeout(() => {
  console.log('\n🚨 EMERGENCY EXIT after 3 minutes');
  process.exit(125);
}, 3 * 60 * 1000);
