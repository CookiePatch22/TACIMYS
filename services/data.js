const { DATA_FILE } = require("../config");
const fs = require('fs').promises;

async function readData(file_path) {
  const raw = await fs.readFile(file_path, 'utf-8');
  return JSON.parse(raw);
}

async function writeData(file_path, data) {
  await fs.writeFile(file_path, JSON.stringify(data, null, 2));
}

module.exports = { writeData, readData } 