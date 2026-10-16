const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const os = require('os');
const Tesseract = require('tesseract.js');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// In-memory shared text buffer
let sharedText = '';
let worker = null;

// Init Tesseract worker once
(async () => {
  worker = await Tesseract.createWorker('eng+ben');
  console.log('OCR worker ready');
})();

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(c => {
    if (c.readyState === 1) c.send(msg);
  });
}

wss.on('connection', (ws) => {
  // Send current buffer on connect
  ws.send(JSON.stringify({ type: 'buffer', text: sharedText }));

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'frame') {
      if (!worker) return;
      try {
        const buf = Buffer.from(msg.data, 'base64');
        const { data: { text } } = await worker.recognize(buf);
        const cleaned = text.replace(/\s+/g, ' ').trim();
        if (cleaned.length > 2) {
          sharedText = cleaned;
          broadcast({ type: 'buffer', text: sharedText });
        }
      } catch (e) {
        console.error('OCR error', e.message);
      }
    }

    if (msg.type === 'clear') {
      sharedText = '';
      broadcast({ type: 'buffer', text: '' });
    }
  });
});

// --- LAN IP detection ---
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Node 18+ returns family as string; older as number 4
      const isIPv4 = net.family === 'IPv4' || net.family === 4;
      if (isIPv4 && !net.internal) {
        return net.address;
      }
    }
  }
  console.warn('⚠️  No LAN IP found — are you on Wi-Fi?');
  return 'localhost';
}

const PORT = 3000;
const LOCAL_IP = getLocalIP();

// --- Expose IP info to the browser for the QR code ---
app.get('/api/info', (req, res) => {
  res.json({
    ip: LOCAL_IP,
    port: PORT,
    phoneUrl: `http://${LOCAL_IP}:${PORT}/phone.html`,
    laptopUrl: `http://${LOCAL_IP}:${PORT}/laptop.html`
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running:`);
  console.log(`  Laptop:  http://localhost:${PORT}/laptop.html`);
  console.log(`  OR use:`);
  console.log(`  Laptop:  http://${LOCAL_IP}:${PORT}/laptop.html`);
  console.log(`  Phone:   http://${LOCAL_IP}:${PORT}/phone.html`);
});
