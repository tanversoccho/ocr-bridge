const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const WebSocket = require('ws');
const path = require('node:path');
test('photo-only server serves enhancement assets and legacy OCR socket (mock OCR)', async () => {
  const child = spawn(
    process.execPath,
    [
      '-e',
      `
  require('node:os').networkInterfaces=()=>({'Wi-Fi':[{address:'192.168.0.107',family:'IPv4',internal:false}]});
  require('tesseract.js').createWorker=async()=>({recognize:async()=>({data:{text:'legacy OCR result'}})});
  const http=require('node:http'),listen=http.Server.prototype.listen;
  http.Server.prototype.listen=function(port,host,cb){return listen.call(this,0,'127.0.0.1',()=>{console.log('TEST_PORT='+this.address().port);cb();});};
  require('./server');
 `,
    ],
    {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, BRIDGE_PASSWORD: 'test-password-123' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  try {
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Startup timeout')), 10000);
      child.stdout.on('data', (d) => {
        const m = /TEST_PORT=(\d+)/.exec(d.toString());
        if (m) {
          clearTimeout(timer);
          resolve(+m[1]);
        }
      });
      child.once('exit', (code) => {
        clearTimeout(timer);
        reject(Error('Server exited ' + code));
      });
    });
    const base = 'http://127.0.0.1:' + port;
    for (const route of [
      '/laptop.html',
      '/phone.html',
      '/photo-filters.js',
      '/photo-enhance-worker.js',
    ])
      assert.equal((await fetch(base + route)).status, 200, route);
    assert.equal((await fetch(base + '/barcode/phone.html')).status, 404);
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(base.replace('http', 'ws'));
      const timer = setTimeout(() => {
        ws.terminate();
        reject(Error('OCR delivery timed out'));
      }, 5000);
      ws.on('open', () => ws.send(JSON.stringify({ type: 'frame', data: 'AA==' })));
      ws.on('message', (raw) => {
        const m = JSON.parse(raw);
        if (m.text === 'legacy OCR result') {
          clearTimeout(timer);
          ws.close();
          resolve();
        }
      });
      ws.on('error', reject);
    });
  } finally {
    child.kill();
    await new Promise((r) => child.once('exit', r));
  }
});
