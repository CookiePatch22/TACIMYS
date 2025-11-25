// Enable env
require('dotenv').config();

// Importing external libraries
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const https = require('https');
const http = require('http');

// Importing locals variables
const { verifyToken } = require('./middleware/auth');
const { readData, writeData } = require('./services/data');
const { readHistory, writeHistory } = require('./services/history');
const { canViewService, canEditService, filterServiceData } = require('./utils/permissions');
const { pollServices } = require("./services/checker/index")
const { DATA_FILE, tlsConfig, HISTORY_DIR, JWT_SECRET, PORT } = require('./config');
const { unit_tests } = require("./tests")

// Setup express server
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

// Ensure history directory exists
fs.mkdir(HISTORY_DIR, { recursive: true });

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

    const data = await readData(DATA_FILE);
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
    await writeData(DATA_FILE, data);

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
    const data = await readData(DATA_FILE);
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
    const data = await readData(DATA_FILE);
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
    const data = await readData(DATA_FILE);
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

    const data = await readData(DATA_FILE);
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

    await writeData(DATA_FILE, data);
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

    const data = await readData(DATA_FILE);
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

    await writeData(DATA_FILE, data);
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
    const data = await readData(DATA_FILE);
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

app.delete('/groups/:name', verifyToken, async (req, res) => {
  try {
    const { name } = req.params;
    const data = await readData(DATA_FILE);
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

    await writeData(DATA_FILE, data);
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting group:', err);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// User management endpoints
app.get('/users/search', verifyToken, async (req, res) => {
  try {
    const { q } = req.query;
    const data = await readData(DATA_FILE);
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
    const data = await readData(DATA_FILE);
    const users = Object.entries(data.users || {})
      .map(([id, user]) => ({ id, username: user.username }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Service management endpoints
app.get('/services', verifyToken, async (req, res) => {
  const data = await readData(DATA_FILE);
  const user = data.users[req.userId];
  const userGroups = user?.groups || [];
  const accessibleServices = data.services
    .filter(s => canViewService(s, req.userId, userGroups))
    .map(s => filterServiceData(s, req.userId, userGroups));
  res.json(accessibleServices);
});

app.get('/services/:id', verifyToken, async (req, res) => {
  const data = await readData(DATA_FILE);
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
  const data = await readData(DATA_FILE);
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
  const data = await readData(DATA_FILE);
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
  await writeData(DATA_FILE, data);

  // Create empty history file
  await writeHistory(newService.id, []);

  res.status(201).json(newService);
});

app.put('/services/:id', verifyToken, async (req, res) => {
  const data = await readData(DATA_FILE);
  const user = data.users[req.userId];
  const userGroups = user?.groups || [];
  const index = data.services.findIndex(s => s.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  if (!canEditService(data.services[index], req.userId, userGroups)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  data.services[index] = { ...data.services[index], ...req.body };
  await writeData(DATA_FILE, data);
  res.json(data.services[index]);
});

app.delete('/services/:id', verifyToken, async (req, res) => {
  const data = await readData(DATA_FILE);
  const user = data.users[req.userId];
  const userGroups = user?.groups || [];
  const index = data.services.findIndex(s => s.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  if (!canEditService(data.services[index], req.userId, userGroups)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const [removed] = data.services.splice(index, 1);
  await writeData(DATA_FILE, data);

  try {
    await fs.unlink(path.join(HISTORY_DIR, `${removed.id}.json`));
  } catch (_) { }

  res.status(204).send();
});

// Perform tests
unit_tests().then(() => {
  // Starting service polling loop
  setInterval(pollServices, 6000);

  // Starting server
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
})

