#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('Starting FAA TCDS Document ID Lookup...');

const mcpProcess = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'pipe'
});

// Send the lookup command
mcpProcess.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'lookup_all_tcds',
    arguments: {}
  }
}) + '\n');

mcpProcess.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString());
    if (response.result && response.result.content) {
      console.log('TCDS Document IDs found:');
      console.log(response.result.content[0].text);
    }
  } catch (e) {
    console.log(data.toString());
  }
});

mcpProcess.stderr.on('data', (data) => {
  console.error(data.toString());
});

mcpProcess.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
});