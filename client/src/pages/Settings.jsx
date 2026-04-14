import { useState, useEffect } from 'react';
import { getConfig, updateConfig, testConnection, testZohoCliq, testClaudeCLI } from '../api/bitbucket';
import {
  Settings as SettingsIcon,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  Plug,
  Eye,
  EyeOff,
  KeyRound,
  Globe,
  Mail,
  User,
  AlertCircle,
  RefreshCw,
  Timer,
  Bot,
  Cpu,
  Webhook,
  Bell,
  MessageSquare,
  Send,
  Sparkles,
  Zap,
} from 'lucide-react';

export default function Settings() {
  const [form, setForm] = useState({
    workspace: '',
    email: '',
    username: '',
    token: '',
    aiProvider: 'openai',
    openaiApiKey: '',
    openaiModel: 'gpt-4o',
    claudeApiKey: '',
    claudeModel: 'claude-sonnet-4-20250514',
    autoRefresh: true,
    refreshInterval: 3,
    zohoCliqWebhookUrl: '',
    deployWebhookUrl: '',
    deployWebhookKey: '',
  });

  const [showToken, setShowToken] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showWebhookKey, setShowWebhookKey] = useState(false);
  const [testingCLI, setTestingCLI] = useState(false);
  const [cliTestResult, setCliTestResult] = useState(null);
  const [testingZoho, setTestingZoho] = useState(false);
  const [zohoTestResult, setZohoTestResult] = useState(null);

  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => { loadConfig(); }, []);

  async function loadConfig() {
    setLoading(true);
    try {
      const cfg = await getConfig();
      const data = {
        workspace: cfg.workspace || '',
        email: cfg.email || '',
        username: cfg.username || '',
        token: '',
        aiProvider: cfg.aiProvider || 'openai',
        openaiApiKey: '',
        openaiModel: cfg.openaiModel || 'gpt-4o',
        claudeApiKey: '',
        claudeModel: cfg.claudeModel || 'claude-sonnet-4-20250514',
        autoRefresh: cfg.autoRefresh !== undefined ? cfg.autoRefresh : true,
        refreshInterval: cfg.refreshInterval || 3,
        zohoCliqWebhookUrl: cfg.zohoCliqWebhookUrl || '',
        deployWebhookUrl: cfg.deployWebhookUrl || '',
        deployWebhookKey: '',
      };
      setForm(data);
      setOriginal({
        ...data,
        tokenPreview: cfg.tokenPreview,
        hasToken: cfg.hasToken,
        openaiKeyPreview: cfg.openaiKeyPreview,
        hasOpenAIKey: cfg.hasOpenAIKey,
        claudeKeyPreview: cfg.claudeKeyPreview,
        hasClaudeKey: cfg.hasClaudeKey,
        hasZohoCliq: cfg.hasZohoCliq,
        hasDeployWebhook: cfg.hasDeployWebhook,
        hasDeployWebhookKey: cfg.hasDeployWebhookKey,
        deployWebhookKeyPreview: cfg.deployWebhookKeyPreview,
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
    setMessage(null);
    setTestResult(null);
    setZohoTestResult(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        autoRefresh: form.autoRefresh,
        refreshInterval: form.refreshInterval,
        zohoCliqWebhookUrl: form.zohoCliqWebhookUrl.trim(),
        deployWebhookUrl: form.deployWebhookUrl.trim(),
      };
      if (form.workspace.trim()) payload.workspace = form.workspace.trim();
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.username.trim()) payload.username = form.username.trim();
      if (form.token.trim()) payload.token = form.token.trim();
      payload.aiProvider = form.aiProvider;
      if (form.openaiApiKey.trim()) payload.openaiApiKey = form.openaiApiKey.trim();
      if (form.openaiModel) payload.openaiModel = form.openaiModel;
      if (form.claudeApiKey.trim()) payload.claudeApiKey = form.claudeApiKey.trim();
      if (form.claudeModel) payload.claudeModel = form.claudeModel;
      if (form.deployWebhookKey.trim()) payload.deployWebhookKey = form.deployWebhookKey.trim();

      const updated = await updateConfig(payload);
      setOriginal({
        workspace: updated.workspace,
        email: updated.email,
        username: updated.username,
        token: '',
        tokenPreview: updated.tokenPreview,
        hasToken: updated.hasToken,
        aiProvider: updated.aiProvider || 'openai',
        openaiApiKey: '',
        openaiKeyPreview: updated.openaiKeyPreview,
        hasOpenAIKey: updated.hasOpenAIKey,
        claudeApiKey: '',
        claudeKeyPreview: updated.claudeKeyPreview,
        hasClaudeKey: updated.hasClaudeKey,
        claudeModel: updated.claudeModel,
        zohoCliqWebhookUrl: updated.zohoCliqWebhookUrl,
        hasZohoCliq: updated.hasZohoCliq,
        deployWebhookUrl: updated.deployWebhookUrl,
        hasDeployWebhook: updated.hasDeployWebhook,
        deployWebhookKey: '',
        hasDeployWebhookKey: updated.hasDeployWebhookKey,
        deployWebhookKeyPreview: updated.deployWebhookKeyPreview,
      });
      setForm((p) => ({ ...p, token: '', openaiApiKey: '', claudeApiKey: '', deployWebhookKey: '' }));
      setMessage({ type: 'success', text: 'Configuration saved!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const payload = {};
      if (form.workspace) payload.workspace = form.workspace;
      if (form.email) payload.email = form.email;
      if (form.token) payload.token = form.token;
      const result = await testConnection(payload);
      setTestResult(result);
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  }

  async function handleTestZoho() {
    setTestingZoho(true);
    setZohoTestResult(null);
    try {
      const url = form.zohoCliqWebhookUrl.trim() || original?.zohoCliqWebhookUrl || '';
      const result = await testZohoCliq(url);
      setZohoTestResult(result);
    } catch (err) {
      setZohoTestResult({ success: false, message: err.message });
    } finally {
      setTestingZoho(false);
    }
  }

  async function handleTestCLI() {
    setTestingCLI(true);
    setCliTestResult(null);
    try {
      const result = await testClaudeCLI();
      setCliTestResult(result);
    } catch (err) {
      setCliTestResult({ success: false, message: err.message });
    } finally {
      setTestingCLI(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-bb-blue" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-bb-text-primary flex items-center gap-3">
          <SettingsIcon size={28} />
          Configuration
        </h1>
        <p className="text-sm text-bb-text-secondary mt-1">
          Configure your Bitbucket workspace, authentication, and notification channels
        </p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-bb-green/10 border border-bb-green/30'
            : 'bg-bb-red/10 border border-bb-red/30'
        }`}>
          {message.type === 'success'
            ? <CheckCircle2 size={18} className="text-bb-green shrink-0" />
            : <AlertCircle size={18} className="text-bb-red shrink-0" />}
          <span className={`text-sm ${message.type === 'success' ? 'text-bb-green' : 'text-bb-red'}`}>
            {message.text}
          </span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">

        {/* ── Workspace ─────────────────────────────────────────────────── */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-bb-text-primary flex items-center gap-2 mb-4">
            <Globe size={18} className="text-bb-blue" />
            Workspace
          </h2>
          <label className="block text-sm text-bb-text-secondary mb-1.5">Workspace Name</label>
          <input
            type="text"
            value={form.workspace}
            onChange={(e) => handleChange('workspace', e.target.value)}
            placeholder="e.g., nikunjrawat2"
            className="input w-full"
          />
          <p className="text-xs text-bb-text-secondary mt-1.5">
            Your Bitbucket workspace slug (bitbucket.org/<strong>workspace</strong>/...)
          </p>
        </div>

        {/* ── Bitbucket Auth ─────────────────────────────────────────────── */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-bb-text-primary flex items-center gap-2 mb-4">
            <KeyRound size={18} className="text-bb-yellow" />
            Authentication
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-bb-text-secondary mb-1.5 flex items-center gap-1.5">
                <Mail size={14} />Email Address
              </label>
              <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)}
                placeholder="you@example.com" className="input w-full" />
            </div>
            <div>
              <label className="block text-sm text-bb-text-secondary mb-1.5 flex items-center gap-1.5">
                <User size={14} />Username
              </label>
              <input type="text" value={form.username} onChange={(e) => handleChange('username', e.target.value)}
                placeholder="e.g., nikunjrawat1" className="input w-full" />
            </div>
            <div>
              <label className="block text-sm text-bb-text-secondary mb-1.5 flex items-center gap-1.5">
                <KeyRound size={14} />App Password / API Token
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={form.token}
                  onChange={(e) => handleChange('token', e.target.value)}
                  placeholder={original?.hasToken ? `Current: ${original.tokenPreview} (leave blank to keep)` : 'Paste your Bitbucket app password'}
                  className="input w-full pr-10"
                />
                <button type="button" onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-bb-text-secondary hover:text-bb-text-primary">
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-bb-text-secondary mt-1.5">
                Bitbucket Settings → Personal settings → App passwords (needs Repositories + Pull requests read/write)
              </p>
              {original?.hasToken && !form.token && (
                <p className="text-xs text-bb-green mt-1 flex items-center gap-1"><CheckCircle2 size={12} />Token configured</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Test Connection ─────────────────────────────────────────────── */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-bb-text-primary flex items-center gap-2 mb-3">
            <Plug size={18} className="text-bb-purple" />
            Test Bitbucket Connection
          </h2>
          <button type="button" onClick={handleTest} disabled={testing}
            className="btn-ghost border border-bb-border flex items-center gap-2 text-sm">
            {testing ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />}
            Test Connection
          </button>
          {testResult && (
            <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
              testResult.success ? 'bg-bb-green/10 border border-bb-green/30' : 'bg-bb-red/10 border border-bb-red/30'
            }`}>
              {testResult.success
                ? <CheckCircle2 size={18} className="text-bb-green shrink-0 mt-0.5" />
                : <XCircle size={18} className="text-bb-red shrink-0 mt-0.5" />}
              <span className={`text-sm ${testResult.success ? 'text-bb-green' : 'text-bb-red'}`}>
                {testResult.message}
              </span>
            </div>
          )}
        </div>

        {/* ── AI Code Review ─────────────────────────────────────────────── */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-bb-text-primary flex items-center gap-2 mb-1">
            <Bot size={18} className="text-bb-blue" />
            AI Code Review
          </h2>
          <p className="text-sm text-bb-text-secondary mb-4">
            Analyzes PR diffs for bugs, security issues, and code quality. Choose your preferred AI provider.
          </p>

          {/* Provider selector */}
          <div className="mb-5">
            <label className="block text-sm text-bb-text-secondary mb-2">AI Provider</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'openai',     label: 'OpenAI',      sub: 'ChatGPT API',    icon: Sparkles, color: 'text-bb-green',  border: 'border-bb-green/50 bg-bb-green/5'   },
                { value: 'claude',     label: 'Claude',      sub: 'Anthropic API',  icon: Zap,      color: 'text-bb-purple', border: 'border-bb-purple/50 bg-bb-purple/5' },
                { value: 'claude-cli', label: 'Claude CLI',  sub: 'Local claude',   icon: Bot,      color: 'text-bb-blue',   border: 'border-bb-blue/50 bg-bb-blue/5'     },
              ].map(({ value, label, sub, icon: Icon, color, border }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleChange('aiProvider', value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                    form.aiProvider === value
                      ? `${border} ${color}`
                      : 'border-bb-border text-bb-text-secondary hover:border-bb-border/60'
                  }`}
                >
                  <Icon size={20} className={form.aiProvider === value ? color : 'text-bb-text-secondary'} />
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-[10px] opacity-70">{sub}</p>
                  {form.aiProvider === value && (
                    <CheckCircle2 size={12} className={color} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* OpenAI fields */}
          {form.aiProvider === 'openai' && (
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-sm text-bb-text-secondary mb-1.5 flex items-center gap-1.5">
                  <KeyRound size={14} />OpenAI API Key
                </label>
                <div className="relative">
                  <input
                    type={showOpenAIKey ? 'text' : 'password'}
                    value={form.openaiApiKey}
                    onChange={(e) => handleChange('openaiApiKey', e.target.value)}
                    placeholder={original?.hasOpenAIKey ? `Current: ${original.openaiKeyPreview} (leave blank to keep)` : 'sk-...'}
                    className="input w-full pr-10"
                  />
                  <button type="button" onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-bb-text-secondary hover:text-bb-text-primary">
                    {showOpenAIKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-bb-text-secondary mt-1.5">
                  Get your key at <span className="text-bb-blue">platform.openai.com/api-keys</span>
                </p>
                {original?.hasOpenAIKey && !form.openaiApiKey && (
                  <p className="text-xs text-bb-green mt-1 flex items-center gap-1"><CheckCircle2 size={12} />OpenAI key configured</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-bb-text-secondary mb-1.5 flex items-center gap-1.5">
                  <Cpu size={14} />Model
                </label>
                <select value={form.openaiModel} onChange={(e) => handleChange('openaiModel', e.target.value)} className="input w-full">
                  <option value="gpt-4o">GPT-4o (Recommended)</option>
                  <option value="gpt-4o-mini">GPT-4o Mini (Fast &amp; cheap)</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="o1-mini">o1 Mini (Reasoning)</option>
                </select>
              </div>
            </div>
          )}

          {/* Claude CLI section */}
          {form.aiProvider === 'claude-cli' && (
            <div className="space-y-4 pt-1">
              <div className="bg-bb-blue/5 border border-bb-blue/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Bot size={18} className="text-bb-blue shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-bb-text-primary mb-1">No API key required</p>
                    <p className="text-xs text-bb-text-secondary leading-relaxed">
                      Uses the <code className="bg-bb-elevated px-1 py-0.5 rounded text-bb-blue text-[11px]">claude</code> CLI installed on this server.
                      Reviews run as local CLI commands and results appear in this dashboard.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <button type="button" onClick={handleTestCLI} disabled={testingCLI}
                  className="btn-ghost border border-bb-border flex items-center gap-2 text-sm disabled:opacity-40">
                  {testingCLI ? <Loader2 size={15} className="animate-spin" /> : <Bot size={15} />}
                  {testingCLI ? 'Testing...' : 'Test Claude CLI'}
                </button>
                {cliTestResult && (
                  <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 text-sm ${
                    cliTestResult.success
                      ? 'bg-bb-green/10 border border-bb-green/30 text-bb-green'
                      : 'bg-bb-red/10 border border-bb-red/30 text-bb-red'
                  }`}>
                    {cliTestResult.success ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" /> : <XCircle size={15} className="shrink-0 mt-0.5" />}
                    {cliTestResult.message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Claude API fields */}
          {form.aiProvider === 'claude' && (
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-sm text-bb-text-secondary mb-1.5 flex items-center gap-1.5">
                  <KeyRound size={14} />Claude API Key
                </label>
                <div className="relative">
                  <input
                    type={showClaudeKey ? 'text' : 'password'}
                    value={form.claudeApiKey}
                    onChange={(e) => handleChange('claudeApiKey', e.target.value)}
                    placeholder={original?.hasClaudeKey ? `Current: ${original.claudeKeyPreview} (leave blank to keep)` : 'sk-ant-api03-...'}
                    className="input w-full pr-10"
                  />
                  <button type="button" onClick={() => setShowClaudeKey(!showClaudeKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-bb-text-secondary hover:text-bb-text-primary">
                    {showClaudeKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-bb-text-secondary mt-1.5">
                  Get your key at <span className="text-bb-blue">console.anthropic.com/api-keys</span>
                </p>
                {original?.hasClaudeKey && !form.claudeApiKey && (
                  <p className="text-xs text-bb-green mt-1 flex items-center gap-1"><CheckCircle2 size={12} />Claude key configured</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-bb-text-secondary mb-1.5 flex items-center gap-1.5">
                  <Cpu size={14} />Model
                </label>
                <select value={form.claudeModel} onChange={(e) => handleChange('claudeModel', e.target.value)} className="input w-full">
                  <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (Recommended)</option>
                  <option value="claude-opus-4-20250514">Claude Opus 4 (Most capable)</option>
                  <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (Fastest)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── Zoho Cliq ─────────────────────────────────────────────────── */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-bb-text-primary flex items-center gap-2 mb-1">
            <MessageSquare size={18} className="text-bb-green" />
            Zoho Cliq Notifications
          </h2>
          <p className="text-sm text-bb-text-secondary mb-4">
            Post deployment messages to a Zoho Cliq channel when staging merges start and complete.
          </p>

          {original?.hasZohoCliq && (
            <div className="mb-4 inline-flex items-center gap-1.5 bg-bb-green/10 border border-bb-green/30 text-bb-green rounded-lg px-3 py-1.5 text-xs">
              <CheckCircle2 size={12} />Webhook configured
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-bb-text-secondary mb-1.5 flex items-center gap-1.5">
                <Globe size={14} />Webhook URL
              </label>
              <input
                type="text"
                value={form.zohoCliqWebhookUrl}
                onChange={(e) => handleChange('zohoCliqWebhookUrl', e.target.value)}
                placeholder="https://cliq.zoho.in/api/v2/channelsbyname/channel/message?zapikey=..."
                className="input w-full font-mono text-xs"
              />
              <p className="text-xs text-bb-text-secondary mt-1.5">
                In Zoho Cliq: go to the channel → Bots &amp; Integrations → Incoming Webhook → copy the URL with <code className="bg-bb-elevated text-bb-blue px-1 py-0.5 rounded">zapikey</code>
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={handleTestZoho}
                disabled={testingZoho || (!form.zohoCliqWebhookUrl && !original?.hasZohoCliq)}
                className="btn-ghost border border-bb-border flex items-center gap-2 text-sm disabled:opacity-40"
              >
                {testingZoho ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Send Test Message
              </button>
              {zohoTestResult && (
                <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${
                  zohoTestResult.success
                    ? 'bg-bb-green/10 border border-bb-green/30'
                    : 'bg-bb-red/10 border border-bb-red/30'
                }`}>
                  {zohoTestResult.success
                    ? <CheckCircle2 size={15} className="text-bb-green shrink-0 mt-0.5" />
                    : <XCircle size={15} className="text-bb-red shrink-0 mt-0.5" />}
                  <span className={`text-xs ${zohoTestResult.success ? 'text-bb-green' : 'text-bb-red'}`}>
                    {zohoTestResult.message}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Generic Webhook (optional fallback) ────────────────────────── */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-bb-text-primary flex items-center gap-2 mb-1">
            <Webhook size={18} className="text-bb-purple" />
            Generic Webhook <span className="text-xs font-normal text-bb-text-secondary ml-1">(optional)</span>
          </h2>
          <p className="text-sm text-bb-text-secondary mb-4">
            Additional webhook for Slack, Discord, or any service that accepts <code className="bg-bb-elevated text-bb-blue px-1 py-0.5 rounded text-[11px]">{'{ "text": "..." }'}</code> POST requests.
            Both Zoho Cliq and this webhook fire simultaneously if configured.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-bb-text-secondary mb-1.5 flex items-center gap-1.5">
                <Bell size={14} />Webhook URL
              </label>
              <input
                type="text"
                value={form.deployWebhookUrl}
                onChange={(e) => handleChange('deployWebhookUrl', e.target.value)}
                placeholder="https://hooks.slack.com/services/... or any POST endpoint"
                className="input w-full"
              />
              {original?.hasDeployWebhook && form.deployWebhookUrl === (original.deployWebhookUrl || '') && form.deployWebhookUrl && (
                <p className="text-xs text-bb-green mt-1 flex items-center gap-1"><CheckCircle2 size={12} />Webhook URL configured</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-bb-text-secondary mb-1.5 flex items-center gap-1.5">
                <KeyRound size={14} />API Key / Bearer Token (optional)
              </label>
              <div className="relative">
                <input
                  type={showWebhookKey ? 'text' : 'password'}
                  value={form.deployWebhookKey}
                  onChange={(e) => handleChange('deployWebhookKey', e.target.value)}
                  placeholder={
                    original?.hasDeployWebhookKey
                      ? `Current: ${original.deployWebhookKeyPreview} (leave blank to keep)`
                      : 'Bearer token if required'
                  }
                  className="input w-full pr-10"
                />
                <button type="button" onClick={() => setShowWebhookKey(!showWebhookKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-bb-text-secondary hover:text-bb-text-primary">
                  {showWebhookKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {original?.hasDeployWebhookKey && !form.deployWebhookKey && (
                <p className="text-xs text-bb-green mt-1 flex items-center gap-1"><CheckCircle2 size={12} />API key configured</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Auto Refresh ───────────────────────────────────────────────── */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-bb-text-primary flex items-center gap-2 mb-4">
            <RefreshCw size={18} className="text-bb-green" />
            Auto Refresh
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-bb-text-primary">Enable Auto Refresh</label>
              <button
                type="button"
                onClick={() => handleChange('autoRefresh', !form.autoRefresh)}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.autoRefresh ? 'bg-bb-green' : 'bg-bb-border'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${form.autoRefresh ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            {form.autoRefresh && (
              <div>
                <label className="block text-sm text-bb-text-secondary mb-1.5 flex items-center gap-1.5">
                  <Timer size={14} />Refresh Interval (minutes)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min="1" max="30" value={form.refreshInterval}
                    onChange={(e) => handleChange('refreshInterval', parseInt(e.target.value))}
                    className="flex-1 h-2 bg-bb-border rounded-lg appearance-none cursor-pointer accent-bb-blue"
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number" min="1" max="30" value={form.refreshInterval}
                      onChange={(e) => { const v = parseInt(e.target.value); if (v >= 1 && v <= 30) handleChange('refreshInterval', v); }}
                      className="input w-16 text-center text-sm"
                    />
                    <span className="text-sm text-bb-text-secondary">min</span>
                  </div>
                </div>
                <p className="text-xs text-bb-text-secondary mt-1.5">
                  Data refreshes every {form.refreshInterval} minute{form.refreshInterval !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Save ───────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Configuration
          </button>
          <button type="button" onClick={loadConfig} className="btn-ghost">Reset</button>
        </div>
      </form>
    </div>
  );
}
