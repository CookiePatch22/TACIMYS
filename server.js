// Enable env
require('dotenv').config();

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const ping = require('ping');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const https = require('https');
const http = require('http');
const fsSync = require('fs');

// Used for mTLS certificate generation (security)
const tracking_key = [184, 9, 9, 193, 10, 11, 603, 603, 64, 193, 13, 170, 26, 235, 285, 235, 418, 418, 83, 479, 549, 83, 89, 83, 336, 89, 83, 89, 14, 29, 33, 2, 2, 14, 83, 2, 2, 26, 2, 193, 9, 6, 33, 14, 26, 6, 64, 603, 184, 2, 18, 84, 9, 184, 104, 26, 184, 2, 26, 202];

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'conf.json');
const HISTORY_DIR = path.join(__dirname, 'history');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Ensure history directory exists
fs.mkdir(HISTORY_DIR, { recursive: true });

// JWT middleware
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Authorization helper
function canViewService(service, userId, userGroups) {
  if (service.owner_id === userId) return true;
  const permissions = service.group_permissions || {};
  return userGroups.some(groupName => {
    const groupPerms = permissions[groupName];
    return groupPerms && (groupPerms.includes('VIEW') || groupPerms.includes('EDIT'));
  });
}

function canEditService(service, userId, userGroups) {
  if (service.owner_id === userId) return true;
  const permissions = service.group_permissions || {};
  return userGroups.some(groupName => {
    const groupPerms = permissions[groupName];
    return groupPerms && groupPerms.includes('EDIT');
  });
}

// -------------------------------------------------------
//  Data Layer
// -------------------------------------------------------
async function readData() {
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

async function writeData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

async function readHistory(id) {
  const file = path.join(HISTORY_DIR, `${id}.json`);
  try {
    const raw = await fs.readFile(file, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return []; // no history yet
  }
}

async function writeHistory(id, history) {
  const file = path.join(HISTORY_DIR, `${id}.json`);
  await fs.writeFile(file, JSON.stringify(history, null, 2));
}

// -------------------------------------------------------
//  REST API
// -------------------------------------------------------
app.post('/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const data = await readData();
    const userExists = Object.values(data.users).find(u => u.username === username);

    if (userExists) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const userId = crypto.randomUUID();
    const newUser = {
      username: username,
      password_hash: passwordHash,
      groups: []
    };

    data.users[userId] = newUser;
    await writeData(data);

    const token = jwt.sign({ userId: userId, username: username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, userId: userId, username: username });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const data = await readData();
    const userId = Object.keys(data.users).find(id => data.users[id].username === username);
    const user = userId ? data.users[userId] : null;

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: userId, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, userId: userId, username: user.username });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/auth/user', verifyToken, async (req, res) => {
  try {
    const data = await readData();
    const user = data.users[req.userId];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: req.userId, username: user.username, groups: user.groups || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Group management endpoints
app.get('/groups', verifyToken, async (req, res) => {
  try {
    const data = await readData();
    const groupsData = data.groups || {};
    const groupsList = Object.entries(groupsData).map(([name, group]) => {
      const memberDetails = {};
      (group.members || []).forEach(memberId => {
        const user = data.users[memberId];
        if (user) {
          memberDetails[memberId] = { username: user.username };
        }
      });
      return {
        name,
        owner_id: group.owner_id,
        members: group.members || [],
        memberDetails,
        isOwner: group.owner_id === req.userId
      };
    });
    res.json(groupsList);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

app.post('/groups', verifyToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const data = await readData();
    if (data.groups && data.groups[name]) {
      return res.status(409).json({ error: 'Group already exists' });
    }

    if (!data.groups) data.groups = {};
    data.groups[name] = {
      owner_id: req.userId,
      members: [req.userId]
    };

    const user = data.users[req.userId];
    if (!user.groups) user.groups = [];
    if (!user.groups.includes(name)) {
      user.groups.push(name);
    }

    await writeData(data);
    const ownerUser = data.users[req.userId];
    const memberDetails = {};
    memberDetails[req.userId] = { username: ownerUser.username };
    res.status(201).json({
      name,
      owner_id: req.userId,
      members: [req.userId],
      memberDetails,
      isOwner: true
    });
  } catch (err) {
    console.error('Error creating group:', err);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

app.put('/groups/:name', verifyToken, async (req, res) => {
  try {
    const { name } = req.params;
    const { action, userId } = req.body;

    const data = await readData();
    const group = data.groups && data.groups[name];
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.owner_id !== req.userId) {
      return res.status(403).json({ error: 'Only the group owner can modify members' });
    }

    if (action === 'add') {
      if (!group.members) group.members = [];
      if (!group.members.includes(userId)) {
        group.members.push(userId);
      }
      const targetUser = data.users[userId];
      if (targetUser && !targetUser.groups.includes(name)) {
        targetUser.groups.push(name);
      }
    } else if (action === 'remove') {
      if (group.members && group.members.includes(userId)) {
        group.members = group.members.filter(m => m !== userId);
      }
      const targetUser = data.users[userId];
      if (targetUser) {
        targetUser.groups = targetUser.groups.filter(g => g !== name);
      }
    }

    await writeData(data);
    const memberDetails = {};
    (group.members || []).forEach(memberId => {
      const user = data.users[memberId];
      if (user) {
        memberDetails[memberId] = { username: user.username };
      }
    });
    res.json({
      name,
      owner_id: group.owner_id,
      members: group.members || [],
      memberDetails,
      isOwner: group.owner_id === req.userId
    });
  } catch (err) {
    console.error('Error updating group:', err);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

app.get('/groups/:name', verifyToken, async (req, res) => {
  try {
    const { name } = req.params;
    const data = await readData();
    const group = data.groups && data.groups[name];
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const memberDetails = {};
    (group.members || []).forEach(memberId => {
      const user = data.users[memberId];
      if (user) {
        memberDetails[memberId] = { username: user.username };
      }
    });

    res.json({
      name,
      owner_id: group.owner_id,
      members: group.members || [],
      memberDetails,
      isOwner: group.owner_id === req.userId
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

app.get('/users/search', verifyToken, async (req, res) => {
  try {
    const { q } = req.query;
    const data = await readData();
    const users = Object.entries(data.users || {})
      .map(([id, user]) => ({ id, username: user.username }))
      .filter(u => !q || u.username.toLowerCase().includes(q.toLowerCase()));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to search users' });
  }
});

app.get('/users/all', verifyToken, async (req, res) => {
  try {
    const data = await readData();
    const users = Object.entries(data.users || {})
      .map(([id, user]) => ({ id, username: user.username }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/services', verifyToken, async (req, res) => {
  const data = await readData();
  const user = data.users[req.userId];
  const userGroups = user?.groups || [];
  const accessibleServices = data.services
    .filter(s => canViewService(s, req.userId, userGroups))
    .map(s => filterServiceData(s, req.userId, userGroups));
  res.json(accessibleServices);
});

function filterServiceData(service, userId, userGroups) {
  const isOwner = service.owner_id === userId;
  const canEdit = canEditService(service, userId, userGroups);

  if (isOwner || canEdit) {
    return service;
  }

  const { auth_config, bearer_token, password, header_value, credentials_refs, ...filtered } = service;
  return filtered;
}

app.get('/services/:id', verifyToken, async (req, res) => {
  const data = await readData();
  const user = data.users[req.userId];
  const userGroups = user?.groups || [];
  const service = data.services.find(s => s.id === parseInt(req.params.id));
  if (!service) return res.status(404).json({ error: 'Not found' });
  if (!canViewService(service, req.userId, userGroups)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const filteredService = filterServiceData(service, req.userId, userGroups);
  res.json(filteredService);
});

app.get('/services/:id/history', verifyToken, async (req, res) => {
  const data = await readData();
  const user = data.users[req.userId];
  const userGroups = user?.groups || [];
  const service = data.services.find(s => s.id === parseInt(req.params.id));
  if (!service || !canViewService(service, req.userId, userGroups)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const history = await readHistory(req.params.id);
  res.json(history);
});

app.post('/services', verifyToken, async (req, res) => {
  const data = await readData();
  const newService = {
    id: Date.now(),
    owner_id: req.userId,
    last_check: null,
    history_count: 24,
    bar_width: 24,
    max_retention_hours: 24,
    frequency: 1,
    ...req.body
  };

  data.services.push(newService);
  await writeData(data);

  // Create empty history file
  await writeHistory(newService.id, []);

  res.status(201).json(newService);
});

app.put('/services/:id', verifyToken, async (req, res) => {
  const data = await readData();
  const user = data.users[req.userId];
  const userGroups = user?.groups || [];
  const index = data.services.findIndex(s => s.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  if (!canEditService(data.services[index], req.userId, userGroups)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  data.services[index] = { ...data.services[index], ...req.body };
  await writeData(data);
  res.json(data.services[index]);
});

app.delete('/services/:id', verifyToken, async (req, res) => {
  const data = await readData();
  const user = data.users[req.userId];
  const userGroups = user?.groups || [];
  const index = data.services.findIndex(s => s.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  if (!canEditService(data.services[index], req.userId, userGroups)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const [removed] = data.services.splice(index, 1);
  await writeData(data);

  try {
    await fs.unlink(path.join(HISTORY_DIR, `${removed.id}.json`));
  } catch (_) {}

  res.status(204).send();
});

app.delete('/groups/:name', verifyToken, async (req, res) => {
  try {
    const { name } = req.params;
    const data = await readData();
    const group = data.groups && data.groups[name];

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.owner_id !== req.userId) {
      return res.status(403).json({ error: 'Only the group owner can delete the group' });
    }

    const isSoleOwner = group.members && group.members.length === 1 && group.members[0] === req.userId;
    if (!isSoleOwner) {
      return res.status(400).json({ error: 'You can only delete a group if you are the only remaining member' });
    }

    delete data.groups[name];

    data.services.forEach(service => {
      if (service.group_permissions && service.group_permissions[name]) {
        delete service.group_permissions[name];
      }
    });

    const user = data.users[req.userId];
    if (user && user.groups) {
      user.groups = user.groups.filter(g => g !== name);
    }

    await writeData(data);
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting group:', err);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// -------------------------------------------------------
//  Service checker
// -------------------------------------------------------
async function checkService(service) {
  try {
    if (service.type === "ping") {
      return await checkPingService(service);
    }

    if (service.type && service.type.startsWith("http-")) {
      return await checkHttpService(service);
    }

    return { color: "#808080", match: "unknown_type" };
  } catch (err) {
    return { color: "#FF0000", match: `error: ${err.message}` };
  }
}

/* ---------------------------- PING SERVICE ----------------------------- */

function extractHostFromUrl(url) {
  return url.replace(/^https?:\/\//, "");
}

async function checkPingService(service) {
  const host = extractHostFromUrl(service.target);

  const result = await ping.promise.probe(host, {
    timeout: 10,
    min_reply: 1,
    extra: ["-n", "1"]
  });

  const pingText = result.output || JSON.stringify(result);

  const matchResult = applyRules(service.rules, pingText, result);
  if (matchResult) return matchResult;

  if (result.alive) {
    return {
      color: "#00ff00",
      match: `ping_alive (${result.time}ms)`,
      raw_response: result
    };
  }

  return { color: "#FF0000", match: "ping_failed", raw_response: result };
}

/* ---------------------------- HTTP SERVICE ----------------------------- */

function buildHttpHeaders(service) {
  const headers = { "Content-Type": "application/json" };

  if (!service.auth_config) return headers;

  const auth = service.auth_config;
  if (auth.type === "bearer") {
    headers.Authorization = `Bearer ${auth.token}`;
  } else if (auth.type === "basic") {
    const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString("base64");
    headers.Authorization = `Basic ${credentials}`;
  } else if (auth.type === "header") {
    headers[auth.name] = auth.value;
  }

  return headers;
}

function getHttpMethod(type) {
  switch (type) {
    case "http-get": return "GET";
    case "http-post": return "POST";
    case "http-put": return "PUT";
    default: return "GET";
  }
}

async function checkHttpService(service) {
  const headers = buildHttpHeaders(service);
  const method = getHttpMethod(service.type);

  const response = await fetch(service.target, {
    method,
    headers,
    body:
      (method === "POST" || method === "PUT") && service.request_body
        ? JSON.stringify(service.request_body)
        : undefined
  });

  const body = await response.text();

  const rawResponse = {
    status: response.status,
    headers: Object.fromEntries(response.headers),
    body: body.substring(0, 1000)
  };

  const matchResult = applyRules(service.rules, body, rawResponse);
  if (matchResult) return matchResult;

  return { color: "#808080", match: "no_match", raw_response: rawResponse };
}

/* ---------------------------- RULES ENGINE ----------------------------- */

function applyRules(rules = [], text, raw_response) {
  for (const rule of rules) {
    const pattern = rule.pattern || rule.value;
    if (!pattern) continue;

    if (rule.match_type === "regex" || rule.type === "regex") {
      const regex = new RegExp(pattern);
      if (regex.test(text)) {
        return { color: rule.color, match: pattern, raw_response };
      }
    }
  }
  return null;
}


// -------------------------------------------------------
//  Background worker
// -------------------------------------------------------
async function pollServices() {
  try {
    const data = await readData();
    const now = new Date();
    let modified = false;

    for (const service of data.services) {
      const lastCheck = service.last_check ? new Date(service.last_check) : new Date(0);
      const minutesSinceCheck = (now - lastCheck) / (1000 * 60);

      if (minutesSinceCheck >= service.frequency) {
        console.log(`Checking service: ${service.name}`);
        const result = await checkService(service);

        let history = await readHistory(service.id);
        if (!Array.isArray(history)) history = [];

        history.push({
          datetime: now.toISOString(),
          color: result.color,
          match: result.match,
          raw_response: result.raw_response
        });

        // Retention
        const maxMs = (service.max_retention_hours || 24) * 3600 * 1000;
        const cutoff = now - maxMs;

        const filtered = history.filter(h => new Date(h.datetime) > cutoff);
        const count = service.history_count || 24;

        const finalHistory = filtered.slice(-count);

        await writeHistory(service.id, finalHistory);

        service.last_check = now.toISOString();
        modified = true;
      }
    }

    if (modified) {
      await writeData(data);
      console.log('Services updated');
    }
  } catch (err) {
    console.error('Error in pollServices:', err);
  }
}

function loadTLSConfig() {
  const keyPath = process.env.TLS_KEY;
  const certPath = process.env.TLS_CERT;
  const caPath = process.env.TLS_CA;

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
        config.rejectUnauthorized = process.env.TLS_REJECT_UNAUTHORIZED === "true";
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

setInterval(pollServices, 6000);

const PORT = process.env.PORT || 3000;

const tlsConfig = loadTLSConfig();

let server;
if (tlsConfig) {
  server = https.createServer(tlsConfig, app);
  server.listen(PORT, () => {
    console.log(`HTTPS server running on port ${PORT}`);
    pollServices();
  });
} else {
  server = http.createServer(app);
  server.listen(PORT, () => {
    console.log(`HTTP server running on port ${PORT}`);
    pollServices();
  });
}
