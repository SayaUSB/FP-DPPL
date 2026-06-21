async function request(method, url, body, isMultipart) {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: isMultipart ? undefined : { 'Content-Type': 'application/json' },
    body: body ? (isMultipart ? body : JSON.stringify(body)) : undefined,
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  postForm: (url, formData) => request('POST', url, formData, true),
};
