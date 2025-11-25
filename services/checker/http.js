const { getHttpMethod } = require('./../../utils/helpers');
const { applyRules } = require("./rules")

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

module.exports = { checkHttpService } 