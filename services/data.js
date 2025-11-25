const { DATA_FILE } = require("../config");
const fs = require('fs').promises;

async function readData() {
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

async function writeData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

module.exports = { writeData, readData } 