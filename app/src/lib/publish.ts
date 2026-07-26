export type PublishResult = {
  url: string;
  sha?: string;
};

function normalizeHeaders(headers: Record<string, unknown>) {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || value === null) {
      normalized[key] = "";
      console.warn(`[publish] normalized header ${key} from`, value);
      continue;
    }
    if (typeof value === "string") {
      if (/[^\x00-\x7F]/.test(value)) {
        console.warn(`[publish] non-ASCII header value for ${key}:`, value);
        console.trace("[publish] call stack for non-ASCII header");
      }
      normalized[key] = value;
      continue;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      normalized[key] = String(value);
      continue;
    }
    console.warn(`[publish] unsupported header value for ${key}`, value);
    normalized[key] = String(value);
  }
  return normalized;
}

function logFetchOptions(url: string, options: RequestInit) {
  console.log("[publish] fetch url:", url);
  console.log("[publish] fetch options:", options);
}

function buildFetchOptions(options: RequestInit): RequestInit {
  const safe: RequestInit = {};
  if (options.method) safe.method = String(options.method);
  if (options.headers) {
    if (options.headers instanceof Headers) {
      safe.headers = options.headers;
    } else if (typeof options.headers === "object" && options.headers !== null) {
      safe.headers = normalizeHeaders(options.headers as Record<string, unknown>);
    }
  }
  if (options.body !== undefined) safe.body = options.body;
  if (options.signal !== undefined) safe.signal = options.signal;
  if (options.cache !== undefined) safe.cache = options.cache;
  if (options.mode !== undefined) safe.mode = options.mode;
  if (options.credentials !== undefined) safe.credentials = options.credentials;
  if (options.redirect !== undefined) safe.redirect = options.redirect;
  if (options.referrer !== undefined) safe.referrer = options.referrer;
  if (options.integrity !== undefined) safe.integrity = options.integrity;
  if (options.keepalive !== undefined) safe.keepalive = options.keepalive;
  return safe;
}

export async function publishToGitHubRepo(opts: {
  owner: string;
  repo: string;
  path: string;
  branch?: string;
  token: string;
  content: string;
  message?: string;
}): Promise<PublishResult> {
  const { owner, repo, path, branch = "main", token, content, message = "Publish content" } = opts;

  console.log(`[publish] Starting publish to ${owner}/${repo}/${path}`);
  console.log(`[publish] Content length: ${content.length} chars`);

  // Check for problematic characters
  const nonAsciiMatches = content.match(/[^\x00-\x7F\n\r\t]/g) || [];
  if (nonAsciiMatches.length > 0) {
    const uniqueChars = [...new Set(nonAsciiMatches)];
    console.warn(
      `[publish] ⚠️ Found ${nonAsciiMatches.length} non-ASCII characters: ${uniqueChars
        .slice(0, 5)
        .map((c) => `${c} (U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")})`)
        .join(", ")}${uniqueChars.length > 5 ? " ..." : ""}`
    );
  }

  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;

  const authToken = String(token ?? "");
  const baseHeaders = {
    Authorization: `Bearer ${authToken}`,
    Accept: "application/vnd.github+json",
  };

  // Check if file exists to include sha for update
  let sha: string | undefined;
  try {
    const url = `${apiBase}?ref=${encodeURIComponent(branch)}`;
    const options = buildFetchOptions({
      method: "GET",
      headers: baseHeaders,
    });
    logFetchOptions(url, options);
    const res = await fetch(url, options);
    if (res.ok) {
      const data = await res.json();
      sha = data.sha;
    }
  } catch (e) {
    // ignore — proceed to create
  }

  // GitHub expects base64 content. Use a proper UTF-8 encoder.
  function toBase64(str: string): string {
    try {
      // Use TextEncoder to properly encode UTF-8, then convert to base64
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      let binary = "";
      for (let i = 0; i < data.length; i++) {
        binary += String.fromCharCode(data[i]);
      }
      const encoded = btoa(binary);
      console.log(`[publish] Encoded ${str.length} chars to ${encoded.length} base64 chars`);
      return encoded;
    } catch (e) {
      console.error("[publish] Encoding failed:", e);
      // Fallback to the old method if TextEncoder fails
      try {
        return btoa(unescape(encodeURIComponent(str)));
      } catch (e2) {
        console.error("[publish] Fallback encoding also failed:", e2);
        throw new Error(`Failed to encode content for GitHub API: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  const body = {
    message,
    content: toBase64(content),
    branch,
    ...(sha ? { sha } : {}),
  };

  const putUrl = apiBase;
  const putOptions = buildFetchOptions({
    method: "PUT",
    headers: {
      ...baseHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  logFetchOptions(putUrl, putOptions);
  const putRes = await fetch(putUrl, putOptions);

  if (!putRes.ok) {
    const txt = await putRes.text();
    throw new Error(`GitHub API error: ${putRes.status} ${txt}`);
  }

  const json = await putRes.json();
  const url = `https://github.com/${owner}/${repo}/blob/${branch}/${path}`;
  const shaOut = json.content?.sha || json.content?.sha;
  return { url, sha: shaOut };
}

export async function deleteFileFromGitHubRepo(opts: {
  owner: string;
  repo: string;
  path: string;
  branch?: string;
  token: string;
  message?: string;
  sha: string;
}): Promise<void> {
  const { owner, repo, path, branch = "main", token, message = "Delete file", sha } = opts;
  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const authToken = String(token ?? "");
  const headers = {
    Authorization: `Bearer ${authToken}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
  const body = JSON.stringify({ message, sha, branch });
  const options = buildFetchOptions({
    method: "DELETE",
    headers,
    body,
  });
  logFetchOptions(apiBase, options);
  const res = await fetch(apiBase, options);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GitHub delete error: ${res.status} ${txt}`);
  }
}

export async function getFileFromGitHubRepo(opts: {
  owner: string;
  repo: string;
  path: string;
  branch?: string;
  token: string;
}): Promise<{ content: string | null; sha?: string }>
{
  const { owner, repo, path, branch = "main", token } = opts;
  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
  const authToken = String(token ?? "");
  const headers = {
    Authorization: `Bearer ${authToken}`,
    Accept: "application/vnd.github+json",
  };
  const options = buildFetchOptions({
    method: "GET",
    headers,
  });
  logFetchOptions(apiBase, options);
  const res = await fetch(apiBase, options);
  if (!res.ok) return { content: null };
  const data = await res.json();
  if (!data.content) return { content: null, sha: data.sha };
  // content is base64 encoded
  const decoded = decodeURIComponent(escape(atob(data.content)));
  return { content: decoded, sha: data.sha };
}
