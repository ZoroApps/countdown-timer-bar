const crypto = require("node:crypto");

function getHeader(headers, name) {
  const lowerName = name.toLowerCase();
  const headerKey = Object.keys(headers || {}).find(
    (key) => key.toLowerCase() === lowerName
  );

  return headerKey ? headers[headerKey] : undefined;
}

function getRawBody(event) {
  if (!event.body) {
    return "";
  }

  if (event.isBase64Encoded) {
    return Buffer.from(event.body, "base64");
  }

  return Buffer.from(event.body, "utf8");
}

function isValidHmac(rawBody, hmacHeader, secret) {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");

  const digestBuffer = Buffer.from(digest, "utf8");
  const hmacBuffer = Buffer.from(hmacHeader, "utf8");

  return (
    digestBuffer.length === hmacBuffer.length &&
    crypto.timingSafeEqual(digestBuffer, hmacBuffer)
  );
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "GET" || event.httpMethod === "HEAD") {
    return {
      statusCode: 200,
      body: "OK",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        Allow: "GET, HEAD, POST",
      },
      body: "Method Not Allowed",
    };
  }

  const secret = process.env.SHOPIFY_API_SECRET;

  if (!secret) {
    return {
      statusCode: 500,
      body: "Missing SHOPIFY_API_SECRET",
    };
  }

  const shopifyHmac = getHeader(event.headers, "x-shopify-hmac-sha256");

  if (!shopifyHmac) {
    return {
      statusCode: 401,
      body: "Missing Shopify HMAC",
    };
  }

  const rawBody = getRawBody(event);

  if (!isValidHmac(rawBody, shopifyHmac, secret)) {
    return {
      statusCode: 401,
      body: "Invalid HMAC",
    };
  }

  return {
    statusCode: 200,
    body: "OK",
  };
};
