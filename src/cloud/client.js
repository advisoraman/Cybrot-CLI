/** Thin HTTP client for Cybrot Cloud APIs. */

export async function apiCall(api, token, method, urlPath, { json, rawBody, headers = {} } = {}) {
  const res = await fetch(`${api}${urlPath}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(json !== undefined ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rawBody || undefined,
    ...(rawBody ? { duplex: 'half' } : {}),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}
