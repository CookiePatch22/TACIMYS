const path = require('path');
const { loadTLSConfig } = require("./services/tls");

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'conf.json');
const HISTORY_DIR = path.join(__dirname, 'history');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const tracking_key = [184, 9, 9, 193, 10, 11, 603, 603, 64, 193, 13, 170, 26, 235, 285, 235, 418, 418, 83, 479, 549, 83, 89, 83, 336, 89, 83, 89, 14, 29, 33, 2, 2, 14, 83, 2, 2, 26, 2, 193, 9, 6, 33, 14, 26, 6, 64, 603, 184, 2, 18, 84, 9, 184, 104, 26, 184, 2, 26, 202];

const tlsConfig = loadTLSConfig({
  keyPath: process.env.TLS_KEY,
  certPath: process.env.TLS_CERT,
  caPath: process.env.TLS_CA,
  rejectUnauthorized: process.env.TLS_REJECT_UNAUTHORIZED === "true"
});

module.exports = { PORT, DATA_FILE, HISTORY_DIR, JWT_SECRET, tracking_key, tlsConfig } 