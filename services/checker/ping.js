const ping = require('ping');

const { extractHostFromUrl } = require("./../../utils/helpers");
const { applyRules } = require("./rules")

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

module.exports = { checkPingService } 