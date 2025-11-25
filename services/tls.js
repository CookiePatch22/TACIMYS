const fsSync = require('fs');

function loadTLSConfig() {
  const keyPath = process.env.TLS_KEY;
  const certPath = process.env.TLS_CERT;
  const caPath = process.env.TLS_CA;
  const tls_reject = process.env.TLS_REJECT_UNAUTHORIZED === "true";

  if (!keyPath || !certPath) {
    console.log("[TLS] No TLS_KEY / TLS_CERT provided → HTTPS disabled.");
    return null;
  }

  if (!fsSync.existsSync(keyPath) || !fsSync.existsSync(certPath)) {
    console.warn("[TLS] Provided TLS certificate paths do not exist → HTTPS disabled.");
    return null;
  }

  try {
    const config = {
      key: fsSync.readFileSync(keyPath),
      cert: fsSync.readFileSync(certPath)
    };

    if (caPath) {
      if (!fsSync.existsSync(caPath)) {
        console.warn("[mTLS] TLS_CA provided but file missing → ignoring CA.");
      } else {
        config.ca = fsSync.readFileSync(caPath);
        config.requestCert = true;
        config.rejectUnauthorized = tls_reject;
        console.log(`[mTLS] Enabled — requestCert=${config.requestCert}, rejectUnauthorized=${config.rejectUnauthorized}`);
      }
    }

    console.log("[TLS] HTTPS enabled.");
    return config;

  } catch (err) {
    console.error("[TLS] Failed to load certificates:", err);
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