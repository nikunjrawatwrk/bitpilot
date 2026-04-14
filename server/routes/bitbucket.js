const express = require('express');
const router = express.Router();
const config = require('../config');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CONTEXTS_DIR = path.join(__dirname, '..', 'codebase-contexts');

/** Call Claude (Anthropic Messages API) and return the text content */
async function callClaude(apiKey, model, systemPrompt, userPrompt, maxTokens = 4096) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const err = parseClaudeError(res.status, await res.json().catch(() => ({})));
    throw Object.assign(new Error(err.message), { code: err.code, status: res.status });
  }
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

/** Map Claude error responses to clean user messages */
function parseClaudeError(status, body) {
  const msg  = body?.error?.message || JSON.stringify(body);
  if (status === 401)
    return { code: 'AI_AUTH',    message: 'Invalid Claude API key. Go to Configuration and update it.' };
  if (status === 402 || msg.includes('credit balance'))
    return { code: 'AI_CREDITS', message: 'Claude credit balance too low. Add credits at console.anthropic.com/billing' };
  if (status === 429)
    return { code: 'AI_RATE',    message: 'Claude rate limit reached. Wait a moment and try again.' };
  if (status === 529 || msg.includes('overloaded'))
    return { code: 'AI_BUSY',    message: 'Claude is overloaded right now. Try again in a few seconds.' };
  return { code: 'AI_ERROR',     message: `Claude API error (${status}): ${msg}` };
}

/** Call Claude CLI (claude -p) via stdin, return text output */
async function callClaudeCLI(systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    const claudeBin = process.env.CLAUDE_BIN || '/root/.local/bin/claude';
    const child = spawn(claudeBin, ['-p', '--output-format', 'json'], {
      env: { ...process.env },
      timeout: 180000, // 3 min
    });

    const fullInput = `${systemPrompt}\n\n---\n\n${userPrompt}`;
    child.stdin.write(fullInput);
    child.stdin.end();

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });

    child.on('close', (code) => {
      try {
        const parsed = JSON.parse(stdout);
        if (parsed.is_error) {
          const err = new Error(parsed.result || 'Claude CLI returned an error');
          err.code = 'AI_ERROR';
          return reject(err);
        }
        resolve(parsed.result || '');
      } catch {
        // Fallback: return raw stdout if it's not JSON
        if (stdout.trim()) return resolve(stdout.trim());
        const err = new Error(`Claude CLI failed (exit ${code}): ${stderr.slice(0, 300)}`);
        err.code = 'AI_ERROR';
        reject(err);
      }
    });

    child.on('error', (err) => {
      const e = new Error(`Claude CLI not found. Ensure 'claude' is installed and in PATH.`);
      e.code = 'AI_CLI_NOT_FOUND';
      reject(e);
    });
  });
}

/** Unified AI dispatcher — uses provider from config */
async function callAI(cfg, systemPrompt, userPrompt, maxTokens = 4096) {
  const provider = cfg.aiProvider || 'openai';
  if (provider === 'claude-cli') {
    return callClaudeCLI(systemPrompt, userPrompt);
  }
  if (provider === 'claude') {
    return callClaude(cfg.claudeApiKey, cfg.claudeModel || 'claude-sonnet-4-20250514', systemPrompt, userPrompt, maxTokens);
  }
  return callOpenAI(cfg.openaiApiKey, cfg.openaiModel || 'gpt-4o', systemPrompt, userPrompt, maxTokens);
}

/** Call OpenAI Chat Completions and return the text content */
async function callOpenAI(apiKey, model, systemPrompt, userPrompt, maxTokens = 4096) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
    }),
  });
  if (!res.ok) {
    const err = parseOpenAIError(res.status, await res.json().catch(() => ({})));
    throw Object.assign(new Error(err.message), { code: err.code, status: res.status });
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/** Map OpenAI error responses to clean user messages */
function parseOpenAIError(status, body) {
  const msg  = body?.error?.message || JSON.stringify(body);
  const code = body?.error?.code    || body?.error?.type || '';

  if (status === 401 || code === 'invalid_api_key')
    return { code: 'AI_AUTH',    message: 'Invalid OpenAI API key. Go to Configuration and update it.' };
  if (status === 429 && (code === 'insufficient_quota' || msg.includes('quota')))
    return { code: 'AI_CREDITS', message: 'OpenAI quota exceeded. Add credits at platform.openai.com/account/billing' };
  if (status === 429)
    return { code: 'AI_RATE',    message: 'OpenAI rate limit reached. Wait a moment and try again.' };
  if (status === 503 || msg.includes('overloaded'))
    return { code: 'AI_BUSY',    message: 'OpenAI is overloaded right now. Try again in a few seconds.' };
  return { code: 'AI_ERROR',     message: `OpenAI API error (${status}): ${msg}` };
}
if (!fs.existsSync(CONTEXTS_DIR)) fs.mkdirSync(CONTEXTS_DIR, { recursive: true });

function contextPath(workspace, repo) {
  return path.join(CONTEXTS_DIR, `${workspace}_${repo}.json`);
}

function loadContext(workspace, repo) {
  const p = contextPath(workspace, repo);
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {}
  return null;
}

function saveContext(workspace, repo, data) {
  fs.writeFileSync(contextPath(workspace, repo), JSON.stringify(data, null, 2), 'utf8');
}

const API_BASE = 'https://api.bitbucket.org/2.0';

function getAuth() {
  const cfg = config.get();
  return 'Basic ' + Buffer.from(`${cfg.email}:${cfg.token}`).toString('base64');
}

function defaultWorkspace() {
  return config.get().workspace;
}

async function bbFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const headers = {
    Authorization: getAuth(),
    ...options.headers,
  };
  // Only set Content-Type when there's a body — Bitbucket rejects
  // Content-Type: application/json on empty-body POSTs (e.g. approve)
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    let detail = '';
    try {
      const parsed = JSON.parse(text);
      detail = parsed?.error?.message || parsed?.message || '';
      if (parsed?.error?.fields) {
        const fields = Object.entries(parsed.error.fields)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join('; ');
        if (fields) detail = detail ? `${detail} (${fields})` : fields;
      }
    } catch {}
    const msg = detail || text.slice(0, 200) || `HTTP ${res.status}`;
    const error = new Error(`Bitbucket API error: ${res.status} — ${msg}`);
    error.status = res.status;
    error.body = text;
    throw error;
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

// GET /api/config
router.get('/config', (req, res) => {
  const cfg = config.get();
  res.json({
    workspace: cfg.workspace,
    username: cfg.username,
    email: cfg.email,
    hasToken: !!cfg.token,
    tokenPreview: cfg.token ? cfg.token.slice(0, 8) + '...' + cfg.token.slice(-4) : '',
    autoRefresh: cfg.autoRefresh,
    refreshInterval: cfg.refreshInterval,
    aiProvider: cfg.aiProvider || 'openai',
    hasOpenAIKey: !!cfg.openaiApiKey,
    openaiKeyPreview: cfg.openaiApiKey ? cfg.openaiApiKey.slice(0, 7) + '...' + cfg.openaiApiKey.slice(-4) : '',
    openaiModel: cfg.openaiModel,
    hasClaudeKey: !!cfg.claudeApiKey,
    claudeKeyPreview: cfg.claudeApiKey ? cfg.claudeApiKey.slice(0, 10) + '...' + cfg.claudeApiKey.slice(-4) : '',
    claudeModel: cfg.claudeModel || 'claude-sonnet-4-20250514',
    hasAIKey: (cfg.aiProvider || 'openai') === 'claude-cli' ? true
             : (cfg.aiProvider || 'openai') === 'claude'     ? !!cfg.claudeApiKey
             : !!cfg.openaiApiKey,
    deployWebhookUrl: cfg.deployWebhookUrl,
    hasDeployWebhookKey: !!cfg.deployWebhookKey,
    deployWebhookKeyPreview: cfg.deployWebhookKey ? cfg.deployWebhookKey.slice(0, 8) + '...' + cfg.deployWebhookKey.slice(-4) : '',
    hasDeployWebhook: !!cfg.deployWebhookUrl,
    zohoCliqWebhookUrl: cfg.zohoCliqWebhookUrl,
    hasZohoCliq: !!cfg.zohoCliqWebhookUrl,
  });
});

// PUT /api/config
router.put('/config', (req, res) => {
  try {
    const { workspace, email, username, token, autoRefresh, refreshInterval, aiProvider, openaiApiKey, openaiModel, claudeApiKey, claudeModel, deployWebhookUrl, deployWebhookKey, zohoCliqWebhookUrl } = req.body;
    const updated = config.save({ workspace, email, username, token, autoRefresh, refreshInterval, aiProvider, openaiApiKey, openaiModel, claudeApiKey, claudeModel, deployWebhookUrl, deployWebhookKey, zohoCliqWebhookUrl });
    res.json({
      workspace: updated.workspace,
      username: updated.username,
      email: updated.email,
      hasToken: !!updated.token,
      tokenPreview: updated.token ? updated.token.slice(0, 8) + '...' + updated.token.slice(-4) : '',
      autoRefresh: updated.autoRefresh,
      refreshInterval: updated.refreshInterval,
      aiProvider: updated.aiProvider || 'openai',
      hasOpenAIKey: !!updated.openaiApiKey,
      openaiKeyPreview: updated.openaiApiKey ? updated.openaiApiKey.slice(0, 7) + '...' + updated.openaiApiKey.slice(-4) : '',
      openaiModel: updated.openaiModel,
      hasClaudeKey: !!updated.claudeApiKey,
      claudeKeyPreview: updated.claudeApiKey ? updated.claudeApiKey.slice(0, 10) + '...' + updated.claudeApiKey.slice(-4) : '',
      claudeModel: updated.claudeModel || 'claude-sonnet-4-20250514',
      hasAIKey: (updated.aiProvider || 'openai') === 'claude-cli' ? true
               : (updated.aiProvider || 'openai') === 'claude'     ? !!updated.claudeApiKey
               : !!updated.openaiApiKey,
      deployWebhookUrl: updated.deployWebhookUrl,
      hasDeployWebhookKey: !!updated.deployWebhookKey,
      deployWebhookKeyPreview: updated.deployWebhookKey ? updated.deployWebhookKey.slice(0, 8) + '...' + updated.deployWebhookKey.slice(-4) : '',
      hasDeployWebhook: !!updated.deployWebhookUrl,
      zohoCliqWebhookUrl: updated.zohoCliqWebhookUrl,
      hasZohoCliq: !!updated.zohoCliqWebhookUrl,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/config/test - Test connection with current (or provided) credentials
router.post('/config/test', async (req, res) => {
  try {
    const cfg = config.get();
    const email = req.body.email || cfg.email;
    const token = req.body.token || cfg.token;
    const workspace = req.body.workspace || cfg.workspace;

    if (!email || !token || !workspace) {
      return res.status(400).json({ error: 'Missing email, token, or workspace' });
    }

    const auth = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');
    const response = await fetch(`${API_BASE}/repositories/${workspace}?pagelen=1`, {
      headers: { Authorization: auth },
    });

    if (response.ok) {
      const data = await response.json();
      res.json({
        success: true,
        message: `Connected! Found ${data.size || data.values?.length || 0} repositories in "${workspace}"`,
      });
    } else if (response.status === 401) {
      res.json({ success: false, message: 'Authentication failed. Check your email and app password.' });
    } else if (response.status === 404) {
      res.json({ success: false, message: `Workspace "${workspace}" not found.` });
    } else {
      res.json({ success: false, message: `Bitbucket returned status ${response.status}` });
    }
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// POST /api/repos/:repo/pullrequests/:id/summarize?workspace=xxx
router.post('/repos/:repo/pullrequests/:id/summarize', async (req, res) => {
  try {
    const cfg = config.get();
    const provider = cfg.aiProvider || 'openai';
    if (provider !== 'claude-cli') {
      const activeKey = provider === 'claude' ? cfg.claudeApiKey : cfg.openaiApiKey;
      if (!activeKey) {
        return res.status(400).json({ error: 'AI API key not configured. Go to Configuration to add it.' });
      }
    }
    const workspace = req.query.workspace || defaultWorkspace();

    const [prData, diffText] = await Promise.all([
      bbFetch(`/repositories/${workspace}/${req.params.repo}/pullrequests/${req.params.id}`),
      bbFetch(`/repositories/${workspace}/${req.params.repo}/pullrequests/${req.params.id}/diff`),
    ]);

    // Count lines added/removed from diff
    let linesAdded = 0, linesRemoved = 0;
    if (typeof diffText === 'string') {
      for (const line of diffText.split('\n')) {
        if (line.startsWith('+') && !line.startsWith('+++')) linesAdded++;
        else if (line.startsWith('-') && !line.startsWith('---')) linesRemoved++;
      }
    }

    const maxDiffLen = 40000;
    const truncatedDiff = typeof diffText === 'string' && diffText.length > maxDiffLen
      ? diffText.slice(0, maxDiffLen) + '\n... [truncated]'
      : (diffText || '');

    const systemPrompt = `You are a senior engineer summarizing a pull request for your team. Write clearly and concisely — no fluff. Focus on what the code actually does, not just the PR title.

Return ONLY valid JSON (no markdown, no code fences):
{
  "headline": "One sharp sentence: what this PR does",
  "summary": "2-3 sentences explaining the change in plain language — what problem it solves or feature it adds, and how",
  "keyChanges": [
    "Specific change 1 (be concrete: file/function names if relevant)",
    "Specific change 2",
    "..."
  ],
  "techDetails": "Any technical patterns, APIs, or approaches worth noting (or null)",
  "testingNotes": "What reviewers/QA should specifically test for this PR (or null)",
  "complexity": "low|medium|high",
  "linesAdded": ${linesAdded},
  "linesRemoved": ${linesRemoved}
}

Keep keyChanges to 3-6 bullet points. Be specific — mention actual functions, endpoints, or components changed.`;

    const userPrompt = `Summarize this PR:

Title: ${prData.title || 'N/A'}
Author: ${prData.author?.display_name || 'Unknown'}
Branch: ${prData.source?.branch?.name || '?'} → ${prData.destination?.branch?.name || '?'}
Description: ${prData.description || 'None'}

Diff:
\`\`\`
${truncatedDiff}
\`\`\``;

    const raw = await callAI(cfg, systemPrompt, userPrompt, 1024);
    let summary;
    try {
      const jsonStr = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
      summary = JSON.parse(jsonStr);
    } catch {
      summary = { headline: raw.slice(0, 120), summary: raw, keyChanges: [], complexity: 'medium', linesAdded, linesRemoved };
    }
    summary.linesAdded = linesAdded;
    summary.linesRemoved = linesRemoved;
    res.json(summary);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/repos/:repo/pullrequests/:id/ai-review?workspace=xxx
router.post('/repos/:repo/pullrequests/:id/ai-review', async (req, res) => {
  try {
    const cfg = config.get();
    const provider = cfg.aiProvider || 'openai';
    if (provider !== 'claude-cli') {
      const activeKey = provider === 'claude' ? cfg.claudeApiKey : cfg.openaiApiKey;
      if (!activeKey) {
        return res.status(400).json({ error: 'AI API key not configured. Go to Configuration to add it.' });
      }
    }

    const workspace = req.query.workspace || defaultWorkspace();

    // Fetch PR details + diff in parallel
    const [prData, diffText] = await Promise.all([
      bbFetch(`/repositories/${workspace}/${req.params.repo}/pullrequests/${req.params.id}`),
      bbFetch(`/repositories/${workspace}/${req.params.repo}/pullrequests/${req.params.id}/diff`),
    ]);

    if (!diffText || typeof diffText !== 'string' || diffText.trim().length === 0) {
      return res.json({
        summary: 'No code changes found in this PR.',
        findings: [],
        approved: true,
      });
    }

    // Truncate very large diffs to stay within token limits
    const maxDiffLen = 80000;
    const truncatedDiff = diffText.length > maxDiffLen
      ? diffText.slice(0, maxDiffLen) + '\n\n... [diff truncated for review] ...'
      : diffText;

    // Load stored codebase context if available
    const codebaseCtx = loadContext(workspace, req.params.repo);
    const hasContext = !!codebaseCtx;

    const contextSection = hasContext ? `
## Codebase Context (use this to give more accurate, project-aware feedback)

**Project:** ${codebaseCtx.projectSummary || ''}
**Stack:** ${codebaseCtx.techStack?.language || ''} / ${codebaseCtx.techStack?.framework || ''} / ${codebaseCtx.techStack?.database || 'no DB mentioned'}
**Architecture:** ${codebaseCtx.architecture?.pattern || ''} — ${codebaseCtx.architecture?.description || ''}
**Conventions:**
- Naming: ${codebaseCtx.conventions?.naming || 'N/A'}
- Error handling: ${codebaseCtx.conventions?.errorHandling || 'N/A'}
- API style: ${codebaseCtx.conventions?.apiStyle || 'N/A'}
**Project-specific review guidelines:**
${(codebaseCtx.reviewGuidelines || []).map(g => `- ${g}`).join('\n')}
` : '';

    const systemPrompt = `You are an expert code reviewer${hasContext ? ' with full knowledge of this codebase' : ''}. Analyze the provided pull request diff and return a comprehensive JSON review.${hasContext ? ' Use the codebase context to give highly specific, project-aware feedback — reference actual patterns, frameworks, and conventions used in this project.' : ''}

Your review must cover:
1. PR Overview — what this PR does and why
2. Changes Breakdown — each file changed with purpose
3. Impact Assessment — what parts of the system are affected, any risks
4. Code Review — check for:
   - Bugs, logic errors, null/undefined issues
   - Security vulnerabilities (SQL injection, XSS, command injection, auth issues)
   - Missing error handling at system boundaries
   - Performance issues (N+1 queries, loops, memory leaks)
   - Hard-coded secrets or credentials
   - Violations of this project's conventions or patterns${hasContext ? ' (use codebase context)' : ''}
   - Missing tests for new functionality

Return ONLY valid JSON (no markdown, no code fences):
{
  "summary": "One paragraph — what this PR does and overall quality",
  "prOverview": {
    "purpose": "What this PR accomplishes in 1-2 sentences",
    "changeType": "feature|bugfix|refactor|hotfix|config|docs|test|chore",
    "impactArea": "Which part of the system is affected",
    "riskLevel": "low|medium|high"
  },
  "filesChanged": [
    {
      "file": "path/to/file",
      "action": "added|modified|deleted|renamed",
      "description": "What changed and why"
    }
  ],
  "findings": [
    {
      "file": "path/to/file",
      "line": 42,
      "type": "bug|security|performance|error-handling|style|convention",
      "severity": "critical|high|medium|low",
      "title": "Short title",
      "description": "What the issue is and why it matters in this project",
      "suggestion": "Specific fix, ideally referencing how this project handles similar cases"
    }
  ],
  "approved": true/false,
  "usedCodebaseContext": ${hasContext}
}

Set "approved" to true ONLY if there are zero critical or high severity findings.
If no issues found, return empty findings array and approved true.
Be thorough but avoid false positives. Only flag real issues.`;

    const userPrompt = `Review this pull request:
${contextSection}
**Title:** ${prData.title || 'N/A'}
**Author:** ${prData.author?.display_name || 'Unknown'}
**Branch:** ${prData.source?.branch?.name || '?'} → ${prData.destination?.branch?.name || '?'}
**Description:** ${prData.description || 'No description'}

**Diff:**
\`\`\`
${truncatedDiff}
\`\`\``;

    const content = await callAI(cfg, systemPrompt, userPrompt, 4096);
    let review;
    try {
      const jsonStr = content.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
      review = JSON.parse(jsonStr);
    } catch {
      review = { summary: content, findings: [], approved: false };
    }
    res.json(review);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// ─── Codebase Context ──────────────────────────────────────────────────────

// GET /api/repos/:repo/codebase-context
router.get('/repos/:repo/codebase-context', (req, res) => {
  const workspace = req.query.workspace || defaultWorkspace();
  const ctx = loadContext(workspace, req.params.repo);
  if (!ctx) return res.json(null);
  res.json(ctx);
});

// DELETE /api/repos/:repo/codebase-context
router.delete('/repos/:repo/codebase-context', (req, res) => {
  const workspace = req.query.workspace || defaultWorkspace();
  const p = contextPath(workspace, req.params.repo);
  if (fs.existsSync(p)) fs.unlinkSync(p);
  res.json({ success: true });
});

// POST /api/repos/:repo/analyze-codebase
router.post('/repos/:repo/analyze-codebase', async (req, res) => {
  try {
    const cfg = config.get();
    const provider = cfg.aiProvider || 'openai';
    if (provider !== 'claude-cli') {
      const activeKey = provider === 'claude' ? cfg.claudeApiKey : cfg.openaiApiKey;
      if (!activeKey) {
        return res.status(400).json({ error: 'AI API key not configured. Go to Configuration to add it.' });
      }
    }

    const workspace = req.query.workspace || defaultWorkspace();
    const repo = req.params.repo;

    // ── Directories / extensions to ignore ───────────────────────────────
    const IGNORE_DIRS = new Set([
      'node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.output',
      'coverage', '.cache', 'vendor', '__pycache__', '.pytest_cache',
      '.venv', 'venv', 'env', '.tox', 'target', 'out', '.idea', '.vscode',
      '.turbo', 'public', 'storage', 'bootstrap/cache',
    ]);
    const TEXT_EXTS = new Set([
      '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
      '.py', '.php', '.rb', '.go', '.java', '.kt', '.swift', '.rs', '.cs',
      '.json', '.yaml', '.yml', '.toml', '.xml',
      '.md', '.txt', '.sh', '.bash', '.sql',
      '.html', '.css', '.scss', '.less',
    ]);
    const KEY_FILES = [
      'README.md', 'readme.md', 'README',
      'package.json', 'composer.json', 'requirements.txt',
      'go.mod', 'pom.xml', 'build.gradle', 'Gemfile', 'Cargo.toml',
      'pyproject.toml', 'setup.py',
      '.env.example', '.env.sample',
      'docker-compose.yml', 'Dockerfile',
      'webpack.config.js', 'vite.config.js', 'tsconfig.json',
      'jest.config.js', 'vitest.config.js', '.eslintrc.js', '.eslintrc.json',
      'app/Http/Kernel.php', 'config/routes.rb',
      'main.go', 'cmd/main.go',
      'src/main.ts', 'src/main.js', 'src/index.ts', 'src/index.js',
      'app.js', 'app.ts', 'index.js', 'index.ts',
      'server/index.js', 'server/app.js',
    ];

    // ── Try local filesystem first ────────────────────────────────────────
    // Tool path: <project-root>/<tool-dir>/server/routes/bitbucket.js
    // Project root is 3 levels up from __dirname
    const TOOL_DIR  = path.resolve(__dirname, '..', '..');
    const PROJECT_ROOT = path.resolve(TOOL_DIR, '..');
    const TOOL_NAME = path.basename(TOOL_DIR);

    function walkLocal(dir, prefix = '', depth = 0) {
      if (depth > 3) return [];
      let entries = [];
      try {
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
          // Skip hidden files/dirs except .env.example
          if (item.name.startsWith('.') && !item.name.match(/^\.env\.(example|sample)$/i)) continue;
          if (item.name === TOOL_NAME) continue; // skip the tool itself
          const relPath = prefix ? `${prefix}/${item.name}` : item.name;
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            if (IGNORE_DIRS.has(item.name)) continue;
            entries.push({ path: relPath, type: 'dir' });
            entries = entries.concat(walkLocal(fullPath, relPath, depth + 1));
          } else {
            const ext = path.extname(item.name).toLowerCase();
            entries.push({ path: relPath, type: 'file', ext });
          }
        }
      } catch {}
      return entries;
    }

    function readLocalFile(filePath) {
      try {
        const full = path.join(PROJECT_ROOT, filePath);
        if (!fs.existsSync(full)) return null;
        let content = fs.readFileSync(full, 'utf8');
        if (content.length > 8000) content = content.slice(0, 8000) + '\n... [truncated]';
        return content;
      } catch { return null; }
    }

    const localEntries = walkLocal(PROJECT_ROOT);
    const hasLocalCode = localEntries.some(e => e.type === 'file' && TEXT_EXTS.has(e.ext));

    let fileTree = '';
    let filesSection = '';
    let sourceLabel = '';

    if (hasLocalCode) {
      // ── Local scan (preferred) ────────────────────────────────────────
      sourceLabel = `local filesystem (${PROJECT_ROOT})`;
      fileTree = localEntries.map(e => `${e.type === 'dir' ? '📁' : '📄'} ${e.path}`).join('\n');

      const fileContents = [];
      for (const f of KEY_FILES) {
        const content = readLocalFile(f);
        if (content) fileContents.push(`\n=== ${f} ===\n${content}`);
        if (fileContents.length >= 15) break;
      }
      filesSection = fileContents.join('\n');
    } else {
      // ── Bitbucket API fallback ────────────────────────────────────────
      sourceLabel = 'Bitbucket API';
      const repoInfo = await bbFetch(`/repositories/${workspace}/${repo}`);
      const defaultBranch = repoInfo.mainbranch?.name || 'main';

      async function listDir(dirPath) {
        try {
          const data = await bbFetch(`/repositories/${workspace}/${repo}/src/${defaultBranch}/${dirPath}?pagelen=50`);
          return (data.values || []).map(v => ({
            path: v.path,
            type: v.type === 'commit_directory' ? 'dir' : 'file',
          }));
        } catch { return []; }
      }

      async function fetchRemoteFile(filePath) {
        try {
          const text = await bbFetch(`/repositories/${workspace}/${repo}/src/${defaultBranch}/${filePath}`);
          if (typeof text !== 'string') return null;
          return text.length > 8000 ? text.slice(0, 8000) + '\n... [truncated]' : text;
        } catch { return null; }
      }

      const rootEntries = await listDir('');
      const srcDirs = rootEntries
        .filter(e => e.type === 'dir' && ['src', 'app', 'lib', 'api', 'server', 'client', 'pages', 'components', 'modules', 'services', 'routes'].includes(e.path.toLowerCase()))
        .slice(0, 5);
      const subEntries = (await Promise.all(srcDirs.map(d => listDir(d.path)))).flat();
      const allEntries = [...rootEntries, ...subEntries];

      fileTree = allEntries.map(e => `${e.type === 'dir' ? '📁' : '📄'} ${e.path}`).join('\n');

      const filesToFetch = KEY_FILES.filter(f => allEntries.some(e => e.path === f));
      const fileContents = await Promise.all(filesToFetch.slice(0, 12).map(async f => {
        const content = await fetchRemoteFile(f);
        return content ? `\n=== ${f} ===\n${content}` : null;
      }));
      filesSection = fileContents.filter(Boolean).join('\n');
    }

    // ── Step 4: Ask Claude to analyze ─────────────────────────────────────
    const systemPrompt = `You are an expert software architect. Analyze the provided repository structure and key files to build a comprehensive understanding of the codebase. This understanding will be used to make PR code reviews much more accurate and context-aware.

Return ONLY valid JSON (no markdown fences) with this exact structure:
{
  "projectSummary": "2-3 sentence description of what this project is and does",
  "techStack": {
    "language": "primary language",
    "framework": "main framework(s)",
    "database": "database technology if any",
    "testing": "test framework if any",
    "other": ["list", "of", "other", "key", "tools"]
  },
  "architecture": {
    "pattern": "e.g. MVC, microservices, monolith, REST API, SPA+API",
    "description": "How the codebase is structured and organized",
    "keyDirectories": [
      { "path": "src/", "purpose": "what lives here" }
    ]
  },
  "conventions": {
    "naming": "naming conventions used",
    "errorHandling": "how errors are handled",
    "apiStyle": "REST/GraphQL/RPC/etc if applicable",
    "stateManagement": "if frontend: how state is managed"
  },
  "keyModules": [
    { "name": "module name", "purpose": "what it does", "path": "path if known" }
  ],
  "dependencies": {
    "production": ["key prod dependencies"],
    "development": ["key dev dependencies"]
  },
  "reviewGuidelines": [
    "Specific things to watch for in PRs for this codebase — security concerns, common mistakes, required patterns, etc."
  ],
  "analyzedAt": "${new Date().toISOString()}",
  "defaultBranch": "${defaultBranch}"
}`;

    const userPrompt = `Repository: ${workspace}/${repo}
Source: ${sourceLabel}

File tree:
${fileTree || '(empty)'}

Key file contents:
${filesSection || '(no key files found)'}`;

    const raw = await callAI(cfg, systemPrompt, userPrompt, 4096);
    let context;
    try {
      const jsonStr = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
      context = JSON.parse(jsonStr);
    } catch {
      return res.status(500).json({ error: 'Failed to parse AI response', raw });
    }

    context.repo = repo;
    context.workspace = workspace;
    context.indexSource = sourceLabel;
    context.fileTreeSnapshot = fileTree;

    saveContext(workspace, repo, context);
    res.json(context);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// ─── END Codebase Context ───────────────────────────────────────────────────

// GET /api/repos?workspace=xxx
router.get('/repos', async (req, res) => {
  try {
    const workspace = req.query.workspace || defaultWorkspace();
    let allRepos = [];
    let url = `/repositories/${workspace}?pagelen=100`;
    while (url) {
      const data = await bbFetch(url);
      allRepos = allRepos.concat(data.values || []);
      url = data.next || null;
    }
    res.json(allRepos);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// GET /api/repos/:repo/pullrequests?state=OPEN&workspace=xxx
router.get('/repos/:repo/pullrequests', async (req, res) => {
  try {
    const workspace = req.query.workspace || defaultWorkspace();
    const state = req.query.state || 'OPEN';
    let allPRs = [];
    let url = `/repositories/${workspace}/${req.params.repo}/pullrequests?state=${state}&pagelen=50`;
    while (url) {
      const data = await bbFetch(url);
      allPRs = allPRs.concat(data.values || []);
      url = data.next || null;
    }
    res.json(allPRs);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// GET /api/repos/:repo/pullrequests/:id?workspace=xxx
router.get('/repos/:repo/pullrequests/:id', async (req, res) => {
  try {
    const workspace = req.query.workspace || defaultWorkspace();
    const data = await bbFetch(
      `/repositories/${workspace}/${req.params.repo}/pullrequests/${req.params.id}`
    );
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// GET /api/repos/:repo/pullrequests/:id/diff?workspace=xxx
router.get('/repos/:repo/pullrequests/:id/diff', async (req, res) => {
  try {
    const workspace = req.query.workspace || defaultWorkspace();
    const data = await bbFetch(
      `/repositories/${workspace}/${req.params.repo}/pullrequests/${req.params.id}/diff`
    );
    res.type('text/plain').send(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// GET /api/repos/:repo/pullrequests/:id/comments?workspace=xxx
router.get('/repos/:repo/pullrequests/:id/comments', async (req, res) => {
  try {
    const workspace = req.query.workspace || defaultWorkspace();
    let allComments = [];
    let url = `/repositories/${workspace}/${req.params.repo}/pullrequests/${req.params.id}/comments?pagelen=100`;
    while (url) {
      const data = await bbFetch(url);
      allComments = allComments.concat(data.values || []);
      url = data.next || null;
    }
    res.json(allComments);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// POST /api/repos/:repo/pullrequests/:id/comments?workspace=xxx
router.post('/repos/:repo/pullrequests/:id/comments', async (req, res) => {
  try {
    const workspace = req.query.workspace || defaultWorkspace();
    const data = await bbFetch(
      `/repositories/${workspace}/${req.params.repo}/pullrequests/${req.params.id}/comments`,
      { method: 'POST', body: JSON.stringify(req.body) }
    );
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// POST /api/repos/:repo/pullrequests/:id/approve?workspace=xxx
router.post('/repos/:repo/pullrequests/:id/approve', async (req, res) => {
  try {
    const workspace = req.query.workspace || defaultWorkspace();
    const data = await bbFetch(
      `/repositories/${workspace}/${req.params.repo}/pullrequests/${req.params.id}/approve`,
      { method: 'POST' }
    );
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// POST /api/repos/:repo/pullrequests/:id/merge?workspace=xxx
router.post('/repos/:repo/pullrequests/:id/merge', async (req, res) => {
  try {
    const workspace = req.query.workspace || defaultWorkspace();
    const body = req.body && Object.keys(req.body).length > 0
      ? req.body
      : { merge_strategy: 'merge_commit', close_source_branch: false };
    const data = await bbFetch(
      `/repositories/${workspace}/${req.params.repo}/pullrequests/${req.params.id}/merge`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// POST /api/repos/:repo/pullrequests?workspace=xxx  (create PR)
router.post('/repos/:repo/pullrequests', async (req, res) => {
  try {
    const workspace = req.query.workspace || defaultWorkspace();
    const data = await bbFetch(
      `/repositories/${workspace}/${req.params.repo}/pullrequests`,
      { method: 'POST', body: JSON.stringify(req.body) }
    );
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// GET /api/repos/:repo/pullrequests/:id/activity?workspace=xxx
router.get('/repos/:repo/pullrequests/:id/activity', async (req, res) => {
  try {
    const workspace = req.query.workspace || defaultWorkspace();
    const data = await bbFetch(
      `/repositories/${workspace}/${req.params.repo}/pullrequests/${req.params.id}/activity?pagelen=50`
    );
    res.json(data.values || []);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// Helper: send a message via Zoho Cliq channel API
async function sendZohoCliqMessage(webhookUrl, text) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoho Cliq error (${res.status}): ${body}`);
  }
  return res.json().catch(() => ({}));
}

// POST /api/webhook/deploy-notify — Send deployment notification via Zoho Cliq and/or generic webhook
router.post('/webhook/deploy-notify', async (req, res) => {
  try {
    const cfg = config.get();
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const hasZoho = !!cfg.zohoCliqWebhookUrl;
    const hasWebhook = !!cfg.deployWebhookUrl;

    if (!hasZoho && !hasWebhook) {
      return res.status(400).json({ error: 'No notification channel configured. Add a Zoho Cliq webhook URL or generic webhook in Settings.' });
    }

    const results = {};

    // Send via Zoho Cliq webhook
    if (hasZoho) {
      try {
        await sendZohoCliqMessage(cfg.zohoCliqWebhookUrl, message);
        results.zohoCliq = 'sent';
      } catch (err) {
        results.zohoCliq = `error: ${err.message}`;
      }
    }

    // Send via generic webhook
    if (hasWebhook) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (cfg.deployWebhookKey) headers['Authorization'] = `Bearer ${cfg.deployWebhookKey}`;
        const r = await fetch(cfg.deployWebhookUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ text: message }),
        });
        results.webhook = r.ok ? 'sent' : `error: ${r.status}`;
      } catch (err) {
        results.webhook = `error: ${err.message}`;
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/claude-cli/test — Verify claude CLI is available and working
router.post('/claude-cli/test', async (req, res) => {
  try {
    const result = await callClaudeCLI(
      'You are a helpful assistant. Be very brief.',
      'Say "Claude CLI is working!" and nothing else.'
    );
    res.json({ success: true, message: `Claude CLI OK — ${result.trim().slice(0, 80)}` });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// POST /api/zoho-cliq/test — Test Zoho Cliq webhook
router.post('/zoho-cliq/test', async (req, res) => {
  try {
    const cfg = config.get();
    const webhookUrl = req.body.zohoCliqWebhookUrl || cfg.zohoCliqWebhookUrl;
    if (!webhookUrl) return res.status(400).json({ success: false, message: 'Zoho Cliq webhook URL is required' });
    await sendZohoCliqMessage(webhookUrl, '✅ Zoho Cliq connected to PR Reviewer! Deployment notifications will appear here.');
    res.json({ success: true, message: 'Test message sent successfully' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
