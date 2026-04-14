import { useState, useEffect, useRef } from 'react';
import { updateConfig, testConnection, testZohoCliq } from '../api/bitbucket';
import {
  GitPullRequest, ArrowRight, ArrowLeft, Check, Eye, EyeOff,
  KeyRound, Globe, Mail, User, Bot, Cpu, MessageSquare,
  Loader2, CheckCircle2, XCircle, Webhook, Bell,
  Zap, Shield, Brain, Rocket, Sparkles,
} from 'lucide-react';

const STEPS = [
  { id: 'welcome',       label: 'Welcome'      },
  { id: 'bitbucket',     label: 'Bitbucket'    },
  { id: 'ai',            label: 'AI Review'    },
  { id: 'notifications', label: 'Notifications' },
  { id: 'done',          label: 'Done'         },
];

function ProgressDots({ current }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <div className={`rounded-full transition-all duration-500 ${
            i < current  ? 'w-2 h-2 bg-bb-green' :
            i === current ? 'w-6 h-2 bg-bb-blue' :
                            'w-2 h-2 bg-bb-border'
          }`} />
        </div>
      ))}
    </div>
  );
}

function FloatingOrb({ className, delay = '' }) {
  return (
    <div className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className} ${delay}`} />
  );
}

/* ─── Step 0: Welcome ───────────────────────────────────────────────────── */
function StepWelcome({ onNext, dir }) {
  return (
    <div className={dir === 1 ? 'ob-slide-right' : 'ob-slide-left'}>
      <div className="text-center mb-10">
        {/* Animated logo */}
        <div className="relative inline-block mb-6 ob-scale-in">
          <div className="absolute inset-0 rounded-3xl bg-bb-blue ob-pulse-ring" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-bb-blue to-bb-purple flex items-center justify-center mx-auto shadow-lg shadow-bb-blue/30 ob-float">
            <GitPullRequest size={40} className="text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-bb-text-primary mb-3 ob-slide-up ob-delay-1">
          Bitbucket PR Reviewer
        </h1>
        <p className="text-bb-text-secondary text-base max-w-sm mx-auto leading-relaxed ob-slide-up ob-delay-2">
          Your intelligent pull request management hub. Let's get you set up in under a minute.
        </p>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {[
          { icon: Brain,    color: 'text-bb-blue',   bg: 'bg-bb-blue/10',   title: 'AI Code Review',      desc: 'GPT analyzes every PR' },
          { icon: Shield,   color: 'text-bb-green',  bg: 'bg-bb-green/10',  title: 'Smart Suggestions',   desc: 'Bug & security detection' },
          { icon: Rocket,   color: 'text-bb-purple', bg: 'bg-bb-purple/10', title: 'Deploy Alerts',       desc: 'Staging notifications' },
          { icon: Sparkles, color: 'text-bb-yellow', bg: 'bg-bb-yellow/10', title: 'Codebase Context',    desc: 'Project-aware feedback' },
        ].map(({ icon: Icon, color, bg, title, desc }, i) => (
          <div key={title} className={`flex items-center gap-3 p-3 rounded-xl bg-bb-elevated border border-bb-border ob-slide-up`}
               style={{ animationDelay: `${0.2 + i * 0.08}s` }}>
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
              <Icon size={16} className={color} />
            </div>
            <div>
              <p className="text-xs font-semibold text-bb-text-primary">{title}</p>
              <p className="text-[11px] text-bb-text-secondary">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button onClick={onNext}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-bb-blue to-bb-purple text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-bb-blue/25 ob-slide-up ob-delay-5">
        Get Started <ArrowRight size={18} />
      </button>
      <p className="text-xs text-bb-text-secondary text-center mt-3 ob-slide-up ob-delay-6">
        Takes about 1 minute · All credentials stay local
      </p>
    </div>
  );
}

/* ─── Step 1: Bitbucket ─────────────────────────────────────────────────── */
function StepBitbucket({ form, onChange, onNext, onBack, dir }) {
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const canTest = form.email && form.token && form.workspace;
  const canNext = form.workspace && form.email && form.token;

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await testConnection({ workspace: form.workspace, email: form.email, token: form.token });
      setTestResult(r);
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className={dir === 1 ? 'ob-slide-right' : 'ob-slide-left'}>
      <div className="mb-6">
        <div className="w-12 h-12 rounded-xl bg-bb-blue/10 flex items-center justify-center mb-4 ob-scale-in">
          <GitPullRequest size={24} className="text-bb-blue" />
        </div>
        <h2 className="text-xl font-bold text-bb-text-primary ob-slide-up">Connect Bitbucket</h2>
        <p className="text-sm text-bb-text-secondary mt-1 ob-slide-up ob-delay-1">
          Your credentials are stored locally and never sent anywhere except Bitbucket.
        </p>
      </div>

      <div className="space-y-3 mb-5">
        {/* Workspace */}
        <div className="ob-slide-up ob-delay-1">
          <label className="block text-xs font-medium text-bb-text-secondary mb-1.5 flex items-center gap-1.5">
            <Globe size={12} />Workspace
          </label>
          <input type="text" value={form.workspace} onChange={e => onChange('workspace', e.target.value)}
            placeholder="your-workspace-slug" className="input w-full" autoFocus />
          <p className="text-[11px] text-bb-text-secondary mt-1">bitbucket.org/<strong>workspace</strong>/...</p>
        </div>

        {/* Email */}
        <div className="ob-slide-up ob-delay-2">
          <label className="block text-xs font-medium text-bb-text-secondary mb-1.5 flex items-center gap-1.5">
            <Mail size={12} />Email
          </label>
          <input type="email" value={form.email} onChange={e => onChange('email', e.target.value)}
            placeholder="you@example.com" className="input w-full" />
        </div>

        {/* Username */}
        <div className="ob-slide-up ob-delay-3">
          <label className="block text-xs font-medium text-bb-text-secondary mb-1.5 flex items-center gap-1.5">
            <User size={12} />Username
          </label>
          <input type="text" value={form.username} onChange={e => onChange('username', e.target.value)}
            placeholder="your-username" className="input w-full" />
        </div>

        {/* App Password */}
        <div className="ob-slide-up ob-delay-4">
          <label className="block text-xs font-medium text-bb-text-secondary mb-1.5 flex items-center gap-1.5">
            <KeyRound size={12} />App Password
          </label>
          <div className="relative">
            <input type={showToken ? 'text' : 'password'} value={form.token}
              onChange={e => onChange('token', e.target.value)}
              placeholder="ATATT3xF..." className="input w-full pr-10" />
            <button type="button" onClick={() => setShowToken(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-bb-text-secondary hover:text-bb-text-primary">
              {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p className="text-[11px] text-bb-text-secondary mt-1">
            Bitbucket Settings → App passwords → Repos (read) + Pull requests (read/write)
          </p>
        </div>
      </div>

      {/* Test Connection */}
      <div className="mb-5 ob-slide-up ob-delay-5">
        <button type="button" onClick={handleTest} disabled={!canTest || testing}
          className="btn-ghost border border-bb-border flex items-center gap-2 text-sm disabled:opacity-40">
          {testing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          Test Connection
        </button>
        {testResult && (
          <div className={`mt-2 p-3 rounded-lg flex items-center gap-2 text-sm ${
            testResult.success ? 'bg-bb-green/10 border border-bb-green/30 text-bb-green'
                               : 'bg-bb-red/10 border border-bb-red/30 text-bb-red'
          }`}>
            {testResult.success ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            {testResult.message}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-ghost flex items-center gap-2 border border-bb-border">
          <ArrowLeft size={16} />
        </button>
        <button onClick={onNext} disabled={!canNext}
          className="flex-1 py-2.5 rounded-xl bg-bb-blue text-white font-semibold flex items-center justify-center gap-2 hover:bg-bb-blue/90 transition-colors disabled:opacity-40">
          Continue <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ─── Step 2: AI Review ─────────────────────────────────────────────────── */
function StepAI({ form, onChange, onNext, onBack, dir }) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className={dir === 1 ? 'ob-slide-right' : 'ob-slide-left'}>
      <div className="mb-6">
        <div className="w-12 h-12 rounded-xl bg-bb-purple/10 flex items-center justify-center mb-4 ob-scale-in">
          <Bot size={24} className="text-bb-purple" />
        </div>
        <h2 className="text-xl font-bold text-bb-text-primary ob-slide-up">AI Code Review</h2>
        <p className="text-sm text-bb-text-secondary mt-1 ob-slide-up ob-delay-1">
          Powered by OpenAI. Detects bugs, security issues, and code quality problems in every PR.
        </p>
      </div>

      {/* What you get */}
      <div className="bg-bb-elevated border border-bb-border rounded-xl p-4 mb-5 space-y-2 ob-slide-up ob-delay-2">
        {[
          'Auto-summary of every PR before you read the diff',
          'Detects bugs, security holes, and performance issues',
          'Project-aware: indexes your codebase for better feedback',
          'Post findings as PR comments with one click',
        ].map((f, i) => (
          <div key={i} className="flex items-center gap-2.5 text-xs text-bb-text-primary">
            <Check size={13} className="text-bb-green shrink-0" />
            {f}
          </div>
        ))}
      </div>

      <div className="space-y-3 mb-5">
        <div className="ob-slide-up ob-delay-3">
          <label className="block text-xs font-medium text-bb-text-secondary mb-1.5 flex items-center gap-1.5">
            <KeyRound size={12} />OpenAI API Key
          </label>
          <div className="relative">
            <input type={showKey ? 'text' : 'password'} value={form.openaiApiKey}
              onChange={e => onChange('openaiApiKey', e.target.value)}
              placeholder="sk-..." className="input w-full pr-10" />
            <button type="button" onClick={() => setShowKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-bb-text-secondary hover:text-bb-text-primary">
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p className="text-[11px] text-bb-text-secondary mt-1">
            Get yours at platform.openai.com/api-keys
          </p>
        </div>

        <div className="ob-slide-up ob-delay-4">
          <label className="block text-xs font-medium text-bb-text-secondary mb-1.5 flex items-center gap-1.5">
            <Cpu size={12} />Model
          </label>
          <select value={form.openaiModel} onChange={e => onChange('openaiModel', e.target.value)} className="input w-full">
            <option value="gpt-4o">GPT-4o — Recommended</option>
            <option value="gpt-4o-mini">GPT-4o mini — Fastest & cheaper</option>
            <option value="gpt-4-turbo">GPT-4 Turbo — Most capable</option>
            <option value="o1-mini">o1-mini — Advanced reasoning</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-ghost flex items-center gap-2 border border-bb-border">
          <ArrowLeft size={16} />
        </button>
        <button onClick={onNext}
          className="flex-1 py-2.5 rounded-xl bg-bb-blue text-white font-semibold flex items-center justify-center gap-2 hover:bg-bb-blue/90 transition-colors">
          {form.openaiApiKey ? <><span>Continue</span><ArrowRight size={16} /></> : <span>Skip for now</span>}
        </button>
      </div>
    </div>
  );
}

/* ─── Step 3: Notifications ─────────────────────────────────────────────── */
function StepNotifications({ form, onChange, onNext, onBack, dir }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const canTestZoho = !!form.zohoCliqWebhookUrl;

  async function handleTestZoho() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await testZohoCliq(form.zohoCliqWebhookUrl);
      setTestResult(r);
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className={dir === 1 ? 'ob-slide-right' : 'ob-slide-left'}>
      <div className="mb-6">
        <div className="w-12 h-12 rounded-xl bg-bb-green/10 flex items-center justify-center mb-4 ob-scale-in">
          <Bell size={24} className="text-bb-green" />
        </div>
        <h2 className="text-xl font-bold text-bb-text-primary ob-slide-up">Deploy Notifications</h2>
        <p className="text-sm text-bb-text-secondary mt-1 ob-slide-up ob-delay-1">
          Get notified in Zoho Cliq when staging deployments start and finish.
        </p>
      </div>

      {/* Zoho Cliq */}
      <div className="border border-bb-border rounded-xl p-4 mb-4 ob-slide-up ob-delay-2">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={15} className="text-bb-green" />
          <span className="text-sm font-semibold text-bb-text-primary">Zoho Cliq</span>
          <span className="text-[10px] text-bb-text-secondary bg-bb-elevated px-2 py-0.5 rounded-full">Recommended</span>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-bb-text-secondary mb-1.5 flex items-center gap-1">
              <Globe size={11} />Incoming Webhook URL
            </label>
            <input type="text" value={form.zohoCliqWebhookUrl}
              onChange={e => onChange('zohoCliqWebhookUrl', e.target.value)}
              placeholder="https://cliq.zoho.in/api/v2/channelsbyname/...?zapikey=..."
              className="input w-full text-sm font-mono" />
            <p className="text-[11px] text-bb-text-secondary mt-1">
              Zoho Cliq → Channel → Incoming Webhook
            </p>
          </div>
          <button type="button" onClick={handleTestZoho} disabled={!canTestZoho || testing}
            className="btn-ghost border border-bb-border flex items-center gap-2 text-xs disabled:opacity-40 py-1.5">
            {testing ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
            Send Test Message
          </button>
          {testResult && (
            <div className={`p-2.5 rounded-lg flex items-center gap-2 text-xs ${
              testResult.success ? 'bg-bb-green/10 border border-bb-green/30 text-bb-green'
                                 : 'bg-bb-red/10 border border-bb-red/30 text-bb-red'
            }`}>
              {testResult.success ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
              {testResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Generic webhook */}
      <div className="border border-bb-border rounded-xl p-4 mb-5 ob-slide-up ob-delay-3">
        <div className="flex items-center gap-2 mb-3">
          <Webhook size={14} className="text-bb-purple" />
          <span className="text-sm font-semibold text-bb-text-primary">Generic Webhook</span>
          <span className="text-[10px] text-bb-text-secondary bg-bb-elevated px-2 py-0.5 rounded-full">Slack, Discord…</span>
        </div>
        <div>
          <label className="block text-xs text-bb-text-secondary mb-1.5 flex items-center gap-1">
            <Globe size={11} />Webhook URL
          </label>
          <input type="text" value={form.deployWebhookUrl}
            onChange={e => onChange('deployWebhookUrl', e.target.value)}
            placeholder="https://hooks.slack.com/services/..." className="input w-full text-sm" />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-ghost flex items-center gap-2 border border-bb-border">
          <ArrowLeft size={16} />
        </button>
        <button onClick={onNext}
          className="flex-1 py-2.5 rounded-xl bg-bb-blue text-white font-semibold flex items-center justify-center gap-2 hover:bg-bb-blue/90 transition-colors">
          {(form.zohoCliqWebhookUrl || form.deployWebhookUrl) ? <><span>Continue</span><ArrowRight size={16} /></> : <span>Skip for now</span>}
        </button>
      </div>
    </div>
  );
}

/* ─── Step 4: Done ──────────────────────────────────────────────────────── */
function StepDone({ form, onFinish, dir }) {
  const configured = [
    { ok: !!(form.workspace && form.token), label: 'Bitbucket connected', icon: GitPullRequest, color: 'text-bb-blue' },
    { ok: !!form.openaiApiKey,              label: 'AI code review ready', icon: Bot,            color: 'text-bb-purple' },
    { ok: !!(form.zohoCliqWebhookUrl || form.deployWebhookUrl), label: 'Deploy notifications', icon: Bell, color: 'text-bb-green' },
  ];

  return (
    <div className={`text-center ${dir === 1 ? 'ob-slide-right' : 'ob-slide-left'}`}>
      {/* Animated success */}
      <div className="relative inline-block mb-6">
        <div className="absolute inset-0 rounded-full bg-bb-green ob-pulse-ring" />
        <div className="relative w-20 h-20 rounded-full bg-bb-green/20 border-2 border-bb-green flex items-center justify-center mx-auto ob-scale-in">
          <svg viewBox="0 0 48 48" className="w-10 h-10">
            <polyline points="8,24 20,36 40,14"
              fill="none" stroke="#3fb950" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="60" strokeDashoffset="0"
              style={{ animation: 'ob-check 0.5s 0.2s ease both', animationFillMode: 'both' }} />
          </svg>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-bb-text-primary mb-2 ob-slide-up ob-delay-1">You're all set!</h2>
      <p className="text-sm text-bb-text-secondary mb-6 ob-slide-up ob-delay-2">
        Your workspace is ready. Here's what's configured:
      </p>

      <div className="space-y-2 mb-8 text-left">
        {configured.map(({ ok, label, icon: Icon, color }, i) => (
          <div key={label}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ob-slide-up ${
              ok ? 'bg-bb-elevated border-bb-border' : 'bg-bb-surface border-bb-border opacity-50'
            }`}
            style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ok ? 'bg-bb-elevated' : 'bg-bb-dark'}`}>
              <Icon size={16} className={ok ? color : 'text-bb-text-secondary'} />
            </div>
            <span className="text-sm text-bb-text-primary flex-1">{label}</span>
            {ok
              ? <CheckCircle2 size={16} className="text-bb-green shrink-0" />
              : <span className="text-[11px] text-bb-text-secondary">Not configured</span>
            }
          </div>
        ))}
      </div>

      <button onClick={onFinish}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-bb-green to-bb-blue text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg ob-slide-up ob-delay-5">
        <Rocket size={18} />Open Dashboard
      </button>
    </div>
  );
}

/* ─── Main Wizard ───────────────────────────────────────────────────────── */
export default function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1); // 1=forward, -1=back
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    workspace: '', email: '', username: '', token: '',
    openaiApiKey: '', openaiModel: 'gpt-4o',
    zohoCliqWebhookUrl: '',
    deployWebhookUrl: '',
  });

  function handleChange(field, value) {
    setForm(p => ({ ...p, [field]: value }));
  }

  function goNext() { setDir(1);  setStep(s => Math.min(s + 1, STEPS.length - 1)); }
  function goBack() { setDir(-1); setStep(s => Math.max(s - 1, 0)); }

  async function handleFinish() {
    setSaving(true);
    try {
      const payload = { autoRefresh: true, refreshInterval: 3 };
      if (form.workspace)      payload.workspace      = form.workspace;
      if (form.email)          payload.email          = form.email;
      if (form.username)       payload.username       = form.username;
      if (form.token)          payload.token          = form.token;
      if (form.openaiApiKey)      payload.openaiApiKey      = form.openaiApiKey;
      if (form.openaiModel)       payload.openaiModel       = form.openaiModel;
      if (form.zohoCliqWebhookUrl) payload.zohoCliqWebhookUrl = form.zohoCliqWebhookUrl;
      if (form.deployWebhookUrl)  payload.deployWebhookUrl  = form.deployWebhookUrl;
      await updateConfig(payload);
    } catch {}
    setSaving(false);
    onComplete();
  }

  const stepComponents = [
    <StepWelcome       key="welcome"       onNext={goNext}                dir={dir} />,
    <StepBitbucket     key="bitbucket"     form={form} onChange={handleChange} onNext={goNext} onBack={goBack} dir={dir} />,
    <StepAI            key="ai"            form={form} onChange={handleChange} onNext={goNext} onBack={goBack} dir={dir} />,
    <StepNotifications key="notifications" form={form} onChange={handleChange} onNext={goNext} onBack={goBack} dir={dir} />,
    <StepDone          key="done"          form={form} onFinish={handleFinish} dir={dir} />,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center ob-fade-in"
         style={{ background: 'rgba(13,17,23,0.92)', backdropFilter: 'blur(12px)' }}>

      {/* Decorative orbs */}
      <FloatingOrb className="w-96 h-96 bg-bb-blue top-[-10%] left-[-10%] ob-spin-slow" />
      <FloatingOrb className="w-80 h-80 bg-bb-purple bottom-[-5%] right-[-5%] ob-spin-slow" style={{ animationDirection: 'reverse' }} />
      <FloatingOrb className="w-64 h-64 bg-bb-green top-1/2 left-1/4" />

      {/* Card */}
      <div className="relative w-full max-w-md mx-4 ob-scale-in">
        <div className="bg-bb-surface border border-bb-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Top bar */}
          <div className="px-6 pt-5 pb-4 border-b border-bb-border flex items-center justify-between">
            <ProgressDots current={step} />
            <span className="text-xs text-bb-text-secondary">
              {step + 1} / {STEPS.length}
            </span>
          </div>

          {/* Step content */}
          <div className="p-6" key={step}>
            {stepComponents[step]}
          </div>
        </div>

        {/* Step label below */}
        <p className="text-center text-xs text-bb-text-secondary mt-3 ob-fade-in">
          {STEPS[step].label}
        </p>
      </div>
    </div>
  );
}
