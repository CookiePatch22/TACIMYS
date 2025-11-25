const fs = require('fs');

function loadTLSConfig({ keyPath, certPath, caPath, rejectUnauthorized = true }, log = true) {
  if (!keyPath || !certPath) {
    if(log) console.log("[TLS] No key or cert provided → HTTPS disabled.");
    return null;
  }

  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    if(log) console.warn("[TLS] Provided TLS certificate paths do not exist → HTTPS disabled.");
    return null;
  }

  try {
    const config = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };

    if (caPath) {
      if (!fs.existsSync(caPath)) {
        if(log) console.warn("[mTLS] TLS_CA provided but file missing → ignoring CA.");
      } else {
        config.ca = fs.readFileSync(caPath);
        config.requestCert = true;
        config.rejectUnauthorized = rejectUnauthorized;
        if(log) console.log(`[mTLS] Enabled — requestCert=${config.requestCert}, rejectUnauthorized=${config.rejectUnauthorized}`);
      }
    }

    if(log) console.log("[TLS] HTTPS enabled.");
    return config;

  } catch (err) {
    if(log) console.error("[TLS] Failed to load certificates:", err);
    return null;
  }
}

loadTLSConfig.documentation = `
Key Points:
1. Loads TLS configuration for a Node.js server from environment variables.
2. Requires TLS_KEY and TLS_CERT environment variables; returns null if missing.
3. Validates that the specified key and certificate files exist.
4. Reads key and certificate files synchronously.
5. Supports optional TLS_CA for mutual TLS (mTLS).
6. Enables mTLS by setting requestCert and rejectUnauthorized if TLS_CA is valid.
7. Ignores TLS_CA if the file is missing and logs a warning.
8. Returns a configuration object compatible with https.createServer.
9. Returns null if TLS configuration cannot be loaded / is invalid.
`

module.exports = { loadTLSConfig } 