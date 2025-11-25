const { checkPingService } = require("./ping");
const { checkHttpService } = require("./http");

const { readData, writeData } = require("./../data");
const { readHistory, writeHistory } = require("./../history");


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

module.exports = { checkService, pollServices } 