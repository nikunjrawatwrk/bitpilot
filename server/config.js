const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

function readFile() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch {
    // ignore parse errors
  }
  return {};
}

function writeFile(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
}

/** Returns merged config: config.json values override .env */
function get() {
  const file = readFile();
  return {
    workspace: file.workspace || process.env.BITBUCKET_WORKSPACE || '',
    email: file.email || process.env.BITBUCKET_EMAIL || '',
    username: file.username || process.env.BITBUCKET_USERNAME || '',
    token: file.token || process.env.BITBUCKET_TOKEN || '',
    aiProvider: file.aiProvider || process.env.AI_PROVIDER || 'openai',
    openaiApiKey: file.openaiApiKey || process.env.OPENAI_API_KEY || '',
    openaiModel: file.openaiModel || process.env.OPENAI_MODEL || 'gpt-4o',
    claudeApiKey: file.claudeApiKey || process.env.CLAUDE_API_KEY || '',
    claudeModel: file.claudeModel || process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
    autoRefresh: file.autoRefresh !== undefined ? file.autoRefresh : true,
    refreshInterval: file.refreshInterval || 3,
    deployWebhookUrl: file.deployWebhookUrl || process.env.DEPLOY_WEBHOOK_URL || '',
    deployWebhookKey: file.deployWebhookKey || process.env.DEPLOY_WEBHOOK_KEY || '',
    zohoCliqWebhookUrl: file.zohoCliqWebhookUrl || process.env.ZOHO_CLIQ_WEBHOOK_URL || '',
  };
}

/** Saves non-empty fields to config.json. Empty strings for credentials are ignored. */
function save(data) {
  const current = readFile();
  const updated = { ...current };
  if (data.workspace) updated.workspace = data.workspace;
  if (data.email) updated.email = data.email;
  if (data.username) updated.username = data.username;
  // Only overwrite token when a new non-empty value is provided
  if (data.token) updated.token = data.token;
  if (data.aiProvider) updated.aiProvider = data.aiProvider;
  if (data.openaiApiKey) updated.openaiApiKey = data.openaiApiKey;
  if (data.openaiModel) updated.openaiModel = data.openaiModel;
  if (data.claudeApiKey) updated.claudeApiKey = data.claudeApiKey;
  if (data.claudeModel) updated.claudeModel = data.claudeModel;
  if (data.autoRefresh !== undefined) updated.autoRefresh = data.autoRefresh;
  if (data.refreshInterval !== undefined) updated.refreshInterval = data.refreshInterval;
  if (data.deployWebhookUrl !== undefined) updated.deployWebhookUrl = data.deployWebhookUrl;
  if (data.deployWebhookKey !== undefined) updated.deployWebhookKey = data.deployWebhookKey;
  if (data.zohoCliqWebhookUrl !== undefined) updated.zohoCliqWebhookUrl = data.zohoCliqWebhookUrl;
  writeFile(updated);
  return get();
}

module.exports = { get, save };
