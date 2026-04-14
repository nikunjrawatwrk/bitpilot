const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const err = new Error(body.error || `Request failed: ${res.status}`);
    if (body.code) err.code = body.code;
    throw err;
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

export function getConfig() {
  return request('/config');
}

export function updateConfig(data) {
  return request('/config', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function testConnection(data) {
  return request('/config/test', {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
}

export function getRepos(workspace) {
  const q = workspace ? `?workspace=${workspace}` : '';
  return request(`/repos${q}`);
}

export function getPullRequests(repo, state = 'OPEN', workspace) {
  const params = new URLSearchParams({ state });
  if (workspace) params.set('workspace', workspace);
  return request(`/repos/${repo}/pullrequests?${params}`);
}

export function getPullRequest(repo, prId, workspace) {
  const q = workspace ? `?workspace=${workspace}` : '';
  return request(`/repos/${repo}/pullrequests/${prId}${q}`);
}

export function getPRDiff(repo, prId, workspace) {
  const q = workspace ? `?workspace=${workspace}` : '';
  return request(`/repos/${repo}/pullrequests/${prId}/diff${q}`);
}

export function getPRComments(repo, prId, workspace) {
  const q = workspace ? `?workspace=${workspace}` : '';
  return request(`/repos/${repo}/pullrequests/${prId}/comments${q}`);
}

export function postComment(repo, prId, body, workspace) {
  const q = workspace ? `?workspace=${workspace}` : '';
  return request(`/repos/${repo}/pullrequests/${prId}/comments${q}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function approvePR(repo, prId, workspace) {
  const q = workspace ? `?workspace=${workspace}` : '';
  return request(`/repos/${repo}/pullrequests/${prId}/approve${q}`, {
    method: 'POST',
  });
}

export function mergePR(repo, prId, workspace, body) {
  const q = workspace ? `?workspace=${workspace}` : '';
  return request(`/repos/${repo}/pullrequests/${prId}/merge${q}`, {
    method: 'POST',
    body: JSON.stringify(
      body || { merge_strategy: 'merge_commit', close_source_branch: false }
    ),
  });
}

export function createPR(repo, body, workspace) {
  const q = workspace ? `?workspace=${workspace}` : '';
  return request(`/repos/${repo}/pullrequests${q}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function summarizePR(repo, prId, workspace) {
  const q = workspace ? `?workspace=${workspace}` : '';
  return request(`/repos/${repo}/pullrequests/${prId}/summarize${q}`, { method: 'POST' });
}

export function aiReview(repo, prId, workspace) {
  const q = workspace ? `?workspace=${workspace}` : '';
  return request(`/repos/${repo}/pullrequests/${prId}/ai-review${q}`, {
    method: 'POST',
  });
}

export function sendDeployNotification(message) {
  return request('/webhook/deploy-notify', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export function testClaudeCLI() {
  return request('/claude-cli/test', { method: 'POST' });
}

export function testZohoCliq(zohoCliqWebhookUrl) {
  return request('/zoho-cliq/test', {
    method: 'POST',
    body: JSON.stringify({ zohoCliqWebhookUrl }),
  });
}

export function getCodebaseContext(repo, workspace) {
  const q = workspace ? `?workspace=${workspace}` : '';
  return request(`/repos/${repo}/codebase-context${q}`);
}

export function analyzeCodebase(repo, workspace) {
  const q = workspace ? `?workspace=${workspace}` : '';
  return request(`/repos/${repo}/analyze-codebase${q}`, { method: 'POST' });
}

export function deleteCodebaseContext(repo, workspace) {
  const q = workspace ? `?workspace=${workspace}` : '';
  return request(`/repos/${repo}/codebase-context${q}`, { method: 'DELETE' });
}
