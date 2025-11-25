function extractHostFromUrl(url) {
  return url.replace(/^https?:\/\//, "");
}

function getHttpMethod(type) {
  switch (type) {
    case "http-get": return "GET";
    case "http-post": return "POST";
    case "http-put": return "PUT";
    default: return "GET";
  }
}


module.exports = { extractHostFromUrl, getHttpMethod } 