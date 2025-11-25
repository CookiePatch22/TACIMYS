const fs = require('fs').promises;
const path = require("path");
const { HISTORY_DIR } = require("../config");

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

module.exports = { writeHistory, readHistory } 