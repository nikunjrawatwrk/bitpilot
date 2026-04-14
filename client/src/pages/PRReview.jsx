import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  getPullRequest,
  getPRDiff,
  getPRComments,
  postComment,
  approvePR,
  mergePR,
  createPR,
  aiReview,
  summarizePR,
  getConfig,
  sendDeployNotification,
  getCodebaseContext,
} from '../api/bitbucket';
import PRDetail from '../components/PRDetail';
import DiffViewer from '../components/DiffViewer';
import CommentsList from '../components/CommentsList';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  FileCode,
  MessageSquare,
  Info,
  CheckCircle2,
  GitMerge,
  Send,
  AlertTriangle,
  X,
  Shield,
  Rocket,
  Bell,
  Timer,
  ArrowRightCircle,
  Bot,
  Bug,
  ShieldAlert,
  Zap,
  AlertOctagon,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Sparkles,
  FileText,
  FilePlus,
  FileEdit,
  FileX,
  FileMinus,
  Gauge,
  Tag,
  Target,
  Brain,
} from 'lucide-react';

const AI_ERROR_INFO = {
  openai: {
    AI_CREDITS: { title: 'OpenAI quota exceeded — add credits to continue',    action: { label: 'Add credits →', url: 'https://platform.openai.com/account/billing' } },
    AI_AUTH:    { title: 'Invalid OpenAI API key',                              action: { label: 'Update in Settings →', url: '/settings' } },
    AI_RATE:    { title: 'OpenAI rate limit reached — try again shortly',       action: null },
    AI_BUSY:    { title: 'OpenAI is overloaded — try again in a few seconds',   action: null },
  },
  claude: {
    AI_CREDITS: { title: 'Claude credit balance too low — add credits to continue', action: { label: 'Add credits →', url: 'https://console.anthropic.com/billing' } },
    AI_AUTH:    { title: 'Invalid Claude API key',                                   action: { label: 'Update in Settings →', url: '/settings' } },
    AI_RATE:    { title: 'Claude rate limit reached — try again shortly',            action: null },
    AI_BUSY:    { title: 'Claude is overloaded — try again in a few seconds',        action: null },
  },
};
AI_ERROR_INFO['claude-cli'] = {
  ...AI_ERROR_INFO.claude,
  AI_CLI_NOT_FOUND: { title: "Claude CLI not found on this server. Install it with: npm install -g @anthropic-ai/claude-code", action: null },
};
// Keep backward compat alias
const CLAUDE_ERROR_INFO = AI_ERROR_INFO.openai;

function ClaudeErrorBanner({ error, onDismiss, compact = false, provider = 'openai' }) {
  const providerErrors = AI_ERROR_INFO[provider] || AI_ERROR_INFO.openai;
  const info = providerErrors[error?.code];
  const title = info?.title || error?.message || String(error);
  const action = info?.action;
  const isExternal = action?.url?.startsWith('http');

  return (
    <div className={`rounded-lg bg-bb-red/10 border border-bb-red/30 flex items-start justify-between gap-3 ${compact ? 'p-3' : 'p-4 mb-4'}`}>
      <div className="flex items-start gap-2 min-w-0">
        <AlertCircle size={15} className="text-bb-red shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm text-bb-red">{title}</p>
          {action && (
            isExternal ? (
              <a href={action.url} target="_blank" rel="noreferrer"
                className="text-xs text-bb-red underline underline-offset-2 mt-1 inline-block hover:opacity-80">
                {action.label}
              </a>
            ) : (
              <a href={action.url}
                className="text-xs text-bb-red underline underline-offset-2 mt-1 inline-block hover:opacity-80">
                {action.label}
              </a>
            )
          )}
        </div>
      </div>
      <button onClick={onDismiss} className="text-bb-red/60 hover:text-bb-red shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}

function isProductionBranch(name) {
  if (!name) return false;
  const l = name.toLowerCase();
  return l === 'production' || l === 'prod' || l === 'main-production' || l.includes('production');
}

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function showDeployNotification(repo, branch) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Deployment Complete', {
      body: `${repo} → staging (${branch}) deployment is done!`,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🚀</text></svg>',
      tag: `deploy-${repo}-${branch}`,
      requireInteraction: true,
    });
  }
}

const COMPLEXITY_CONFIG = {
  low:    { color: 'text-bb-green',  bg: 'bg-bb-green/10 border-bb-green/30',   label: 'Low Complexity' },
  medium: { color: 'text-bb-yellow', bg: 'bg-bb-yellow/10 border-bb-yellow/30', label: 'Medium Complexity' },
  high:   { color: 'text-bb-red',    bg: 'bg-bb-red/10 border-bb-red/30',       label: 'High Complexity' },
};

const SEVERITY_CONFIG = {
  critical: { color: 'bb-red', bg: 'bg-bb-red/10 border-bb-red/30', icon: AlertOctagon },
  high: { color: 'bb-red', bg: 'bg-bb-red/10 border-bb-red/30', icon: ShieldAlert },
  medium: { color: 'bb-yellow', bg: 'bg-bb-yellow/10 border-bb-yellow/30', icon: AlertTriangle },
  low: { color: 'bb-blue', bg: 'bg-bb-blue/10 border-bb-blue/30', icon: Eye },
};

const TYPE_LABELS = {
  bug: 'Bug',
  security: 'Security',
  performance: 'Performance',
  'error-handling': 'Error Handling',
  style: 'Style',
};

export default function PRReview() {
  const { repoSlug, prId } = useParams();
  const [searchParams] = useSearchParams();
  const workspace = searchParams.get('workspace') || undefined;
  const autoReview = searchParams.get('autoReview') === '1';

  const [pr, setPr] = useState(null);
  const [diff, setDiff] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasAIKey, setHasAIKey] = useState(false);
  const [aiProvider, setAIProvider] = useState('openai');
  const [hasDeployWebhook, setHasZohoWebhook] = useState(false);
  const [codebaseContext, setCodebaseContext] = useState(null);

  // Code summary state
  const [summaryState, setSummaryState] = useState('idle'); // idle | loading | done | error
  const [summaryData, setSummaryData] = useState(null);
  const [summaryError, setSummaryError] = useState(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [merging, setMerging] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);

  // AI Review state
  const [autoReviewTriggered, setAutoReviewTriggered] = useState(false);
  const [reviewState, setReviewState] = useState('idle'); // idle | reviewing | done
  const [reviewData, setReviewData] = useState(null);
  const [reviewError, setReviewError] = useState(null);
  const [selectedFindings, setSelectedFindings] = useState(new Set());
  const [postingFindings, setPostingFindings] = useState(false);
  const [findingsPosted, setFindingsPosted] = useState(false);

  // Post-merge staging flow
  const [showStagingPrompt, setShowStagingPrompt] = useState(false);
  const [stagingMerging, setStagingMerging] = useState(false);
  const [stagingStatus, setStagingStatus] = useState(null);
  const [stagingError, setStagingError] = useState(null);
  const [mergedBranch, setMergedBranch] = useState(null);

  // Deployment timer
  const [deployTimer, setDeployTimer] = useState(0);
  const [deployTimerActive, setDeployTimerActive] = useState(false);
  const timerRef = useRef(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [prData, diffData, commentsData, cfg] = await Promise.all([
        getPullRequest(repoSlug, prId, workspace),
        getPRDiff(repoSlug, prId, workspace).catch(() => null),
        getPRComments(repoSlug, prId, workspace).catch(() => []),
        getConfig(),
      ]);
      setPr(prData);
      setDiff(diffData);
      setComments(commentsData);
      setHasAIKey(cfg.hasAIKey);
      setAIProvider(cfg.aiProvider || 'openai');
      setHasZohoWebhook(cfg.hasDeployWebhook);
      // Load codebase context for richer AI review info
      getCodebaseContext(repoSlug).then(setCodebaseContext).catch(() => setCodebaseContext(null));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Reset state on navigation
    setReviewState('idle');
    setReviewData(null);
    setReviewError(null);
    setFindingsPosted(false);
    setActiveTab('overview');
    setSummaryState('idle');
    setSummaryData(null);
    setSummaryError(null);

    load().then(() => {
      if (autoReview) {
        setTimeout(() => setAutoReviewTriggered(true), 100);
      }
    });
    requestNotificationPermission();
  }, [repoSlug, prId, workspace]);

  // Auto-trigger AI review after load
  useEffect(() => {
    if (autoReviewTriggered && hasAIKey && reviewState === 'idle' && !loading) {
      setAutoReviewTriggered(false);
      handleAIReview();
    }
  }, [autoReviewTriggered, hasAIKey, reviewState, loading, aiProvider]);

  // Auto-generate code summary when PR loads and Claude key is present
  useEffect(() => {
    if (!loading && hasAIKey && summaryState === 'idle' && pr) {
      handleGenerateSummary();
    }
  }, [loading, hasAIKey, pr]);

  // Deployment countdown
  useEffect(() => {
    if (!deployTimerActive) return;
    timerRef.current = setInterval(() => {
      setDeployTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setDeployTimerActive(false);
          showDeployNotification(repoSlug, mergedBranch);
          // Send Zoho notification — deployment done
          if (hasDeployWebhook) {
            sendDeployNotification(
              `✅ *Staging Deployment Complete*\nRepo: ${repoSlug}\nBranch: ${mergedBranch} → staging\nDeployment is done, you can continue.`
            ).catch(() => {});
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [deployTimerActive, repoSlug, mergedBranch, hasDeployWebhook]);

  // --- Code Summary ---
  async function handleGenerateSummary() {
    setSummaryState('loading');
    setSummaryError(null);
    try {
      const result = await summarizePR(repoSlug, prId, workspace);
      setSummaryData(result);
      setSummaryState('done');
    } catch (err) {
      setSummaryError({ message: err.message, code: err.code });
      setSummaryState('error');
    }
  }

  // --- AI Review ---
  async function handleAIReview() {
    setReviewState('reviewing');
    setReviewError(null);
    setReviewData(null);
    setSelectedFindings(new Set());
    setFindingsPosted(false);
    try {
      const result = await aiReview(repoSlug, prId, workspace);
      setReviewData(result);
      // Auto-select all findings
      if (result.findings?.length > 0) {
        setSelectedFindings(new Set(result.findings.map((_, i) => i)));
      }
      setReviewState('done');
      setActiveTab('ai-review');
    } catch (err) {
      setReviewError({ message: err.message, code: err.code });
      setReviewState('idle');
    }
  }

  function toggleFinding(index) {
    setSelectedFindings((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function selectAllFindings() {
    if (reviewData?.findings) {
      setSelectedFindings(new Set(reviewData.findings.map((_, i) => i)));
    }
  }

  function deselectAllFindings() {
    setSelectedFindings(new Set());
  }

  async function handlePostFindings() {
    if (!reviewData?.findings || selectedFindings.size === 0) return;
    setPostingFindings(true);
    try {
      for (const idx of selectedFindings) {
        const f = reviewData.findings[idx];
        const body = {
          content: {
            raw: `**[AI Review — ${(TYPE_LABELS[f.type] || f.type).toUpperCase()} / ${f.severity?.toUpperCase()}]** ${f.title}\n\n${f.description}\n\n**Suggestion:** ${f.suggestion}`,
          },
        };
        // Post as inline comment if file + line available
        if (f.file && f.line) {
          body.inline = { path: f.file, to: f.line };
        }
        await postComment(repoSlug, prId, body, workspace);
      }
      setFindingsPosted(true);
      setActionMsg({
        type: 'success',
        text: `${selectedFindings.size} review comment${selectedFindings.size > 1 ? 's' : ''} posted!`,
      });
      // Refresh comments
      const updated = await getPRComments(repoSlug, prId, workspace);
      setComments(updated);
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message });
    } finally {
      setPostingFindings(false);
    }
  }

  // --- Other handlers ---
  async function handlePostComment() {
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      await postComment(repoSlug, prId, { content: { raw: commentText } }, workspace);
      setCommentText('');
      const updated = await getPRComments(repoSlug, prId, workspace);
      setComments(updated);
      setActionMsg({ type: 'success', text: 'Comment posted!' });
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message });
    } finally {
      setPosting(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    try {
      await approvePR(repoSlug, prId, workspace);
      setActionMsg({ type: 'success', text: 'PR approved!' });
      await load();
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message });
    } finally {
      setApproving(false);
    }
  }

  async function handleMerge() {
    setMerging(true);
    try {
      await mergePR(repoSlug, prId, workspace);
      const destBranch = pr?.destination?.branch?.name;
      setMergedBranch(destBranch);
      setActionMsg({ type: 'success', text: 'PR merged successfully!' });
      setShowMergeConfirm(false);
      if (destBranch?.toLowerCase() !== 'staging') {
        setShowStagingPrompt(true);
      }
      await load();
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message });
    } finally {
      setMerging(false);
    }
  }

  async function handleStagingMerge() {
    setStagingMerging(true);
    setStagingError(null);
    const destBranch = mergedBranch || pr?.destination?.branch?.name;
    try {
      const newPR = await createPR(
        repoSlug,
        {
          title: `Merge ${destBranch} into staging`,
          source: { branch: { name: destBranch } },
          destination: { branch: { name: 'staging' } },
          close_source_branch: false,
        },
        workspace
      );
      await approvePR(repoSlug, newPR.id, workspace);
      await mergePR(repoSlug, newPR.id, workspace, {
        merge_strategy: 'merge_commit',
        close_source_branch: false,
      });
      setStagingStatus('success');
      setShowStagingPrompt(false);
      setDeployTimer(16 * 60);
      setDeployTimerActive(true);
      requestNotificationPermission();
      // Send Zoho notification — deployment started
      if (hasDeployWebhook) {
        sendDeployNotification(
          `🚀 *Staging Deployment Started*\nRepo: ${repoSlug}\nBranch: ${destBranch} → staging\nPlease wait 15 minutes for deployment to complete.`
        ).catch(() => {});
      }
    } catch (err) {
      setStagingError(err.message);
      setStagingStatus('error');
    } finally {
      setStagingMerging(false);
    }
  }

  function cancelDeployTimer() {
    clearInterval(timerRef.current);
    setDeployTimerActive(false);
    setDeployTimer(0);
  }

  // --- Derived state ---
  const destBranch = pr?.destination?.branch?.name;
  const isProd = isProductionBranch(destBranch);
  const isOpen = pr?.state === 'OPEN';

  const reviewClean = reviewState === 'done' && reviewData?.approved === true;
  const reviewHasFindings = reviewState === 'done' && (reviewData?.findings?.length || 0) > 0;
  // Show approve/merge when: AI review passed clean, OR findings have been posted as comments
  const canApproveAndMerge = !hasAIKey || reviewClean || findingsPosted;

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Info },
    { key: 'diff', label: 'Diff', icon: FileCode },
    { key: 'comments', label: `Comments (${comments.length})`, icon: MessageSquare },
    ...(hasAIKey
      ? [{
          key: 'ai-review',
          label: reviewState === 'done'
            ? reviewClean
              ? 'AI Review (Clean)'
              : `AI Review (${reviewData?.findings?.length || 0})`
            : 'AI Review',
          icon: Bot,
        }]
      : []),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-bb-blue" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-bb-red/10 border border-bb-red/30 rounded-xl p-6 flex items-center gap-3">
          <AlertCircle size={24} className="text-bb-red shrink-0" />
          <div>
            <p className="font-semibold text-bb-red">Failed to load PR</p>
            <p className="text-sm text-bb-red/80 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to={`/repos/${repoSlug}/prs`}
          className="w-9 h-9 rounded-lg bg-bb-surface border border-bb-border flex items-center justify-center hover:border-bb-blue/40 transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-bb-text-primary">
            {pr?.title}
            <span className="text-bb-text-secondary font-normal ml-2">#{prId}</span>
          </h1>
        </div>
      </div>

      {/* Deployment Timer Banner */}
      {deployTimerActive && deployTimer > 0 && (
        <div className="mb-4 p-4 rounded-xl bg-bb-purple/10 border border-bb-purple/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-bb-purple/20 flex items-center justify-center">
              <Rocket size={20} className="text-bb-purple" />
            </div>
            <div>
              <p className="text-sm font-semibold text-bb-purple">Staging Deployment in Progress</p>
              <p className="text-xs text-bb-purple/70 mt-0.5">You'll get a notification when it's done</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-bb-purple">{formatTimer(deployTimer)}</p>
              <p className="text-[10px] text-bb-purple/60 uppercase tracking-wider">remaining</p>
            </div>
            <button onClick={cancelDeployTimer} className="text-bb-purple/50 hover:text-bb-purple" title="Cancel timer">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Deployment Complete Banner */}
      {deployTimer === 0 && stagingStatus === 'success' && !deployTimerActive && (
        <div className="mb-4 p-4 rounded-xl bg-bb-green/10 border border-bb-green/30 flex items-center gap-3">
          <Rocket size={20} className="text-bb-green" />
          <p className="text-sm font-semibold text-bb-green">Staging deployment complete!</p>
        </div>
      )}

      {/* Action message */}
      {actionMsg && (
        <div className={`mb-4 p-3 rounded-lg flex items-center justify-between ${
          actionMsg.type === 'success'
            ? 'bg-bb-green/10 border border-bb-green/30 text-bb-green'
            : 'bg-bb-red/10 border border-bb-red/30 text-bb-red'
        }`}>
          <span className="text-sm">{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)}><X size={14} /></button>
        </div>
      )}

      {/* AI Error Banner */}
      {reviewError && <ClaudeErrorBanner error={reviewError} onDismiss={() => setReviewError(null)} provider={aiProvider} />}

      {/* Staging Merge Prompt */}
      {showStagingPrompt && (
        <div className="mb-6 card p-6 border-bb-blue/40">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-bb-blue/20 flex items-center justify-center shrink-0">
              <ArrowRightCircle size={20} className="text-bb-blue" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-bb-text-primary">Merge to Staging?</h3>
              <p className="text-sm text-bb-text-secondary mt-1">
                PR has been merged into{' '}
                <code className="bg-bb-elevated text-bb-blue px-1.5 py-0.5 rounded text-xs">{mergedBranch}</code>
                . Would you like to also merge this into{' '}
                <code className="bg-bb-elevated text-bb-green px-1.5 py-0.5 rounded text-xs">staging</code>?
              </p>
              {stagingError && (
                <div className="mt-3 p-3 rounded-lg bg-bb-red/10 border border-bb-red/30">
                  <p className="text-xs text-bb-red flex items-start gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />{stagingError}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-3 mt-4">
                <button onClick={handleStagingMerge} disabled={stagingMerging} className="btn-primary flex items-center gap-2 text-sm">
                  {stagingMerging ? <Loader2 size={14} className="animate-spin" /> : <GitMerge size={14} />}
                  {stagingMerging ? 'Merging to staging...' : 'Yes, merge to staging'}
                </button>
                <button onClick={() => setShowStagingPrompt(false)} disabled={stagingMerging} className="btn-ghost text-sm">Skip</button>
              </div>
              <p className="text-[11px] text-bb-text-secondary mt-3 flex items-center gap-1.5">
                <Bell size={11} />A 16-min deployment timer with notifications will start after merge
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-bb-border">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === key
                ? key === 'ai-review'
                  ? reviewClean
                    ? 'border-bb-green text-bb-green'
                    : reviewHasFindings
                    ? 'border-bb-yellow text-bb-yellow'
                    : 'border-bb-blue text-bb-blue'
                  : 'border-bb-blue text-bb-blue'
                : 'border-transparent text-bb-text-secondary hover:text-bb-text-primary'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <PRDetail pr={pr} />

              {/* Code Summary */}
              {hasAIKey && (
                <div className="card overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-bb-border">
                    <h3 className="text-sm font-semibold text-bb-text-primary flex items-center gap-2">
                      <Sparkles size={15} className="text-bb-purple" />
                      Code Summary
                    </h3>
                    {summaryState === 'done' && (
                      <button
                        onClick={handleGenerateSummary}
                        className="text-xs text-bb-text-secondary hover:text-bb-text-primary flex items-center gap-1"
                      >
                        <RefreshCw size={12} />Regenerate
                      </button>
                    )}
                  </div>

                  {/* Loading */}
                  {summaryState === 'loading' && (
                    <div className="px-5 py-8 flex items-center gap-3 text-bb-text-secondary">
                      <Loader2 size={16} className="animate-spin text-bb-purple" />
                      <span className="text-sm">Summarizing code changes...</span>
                    </div>
                  )}

                  {/* Error */}
                  {summaryState === 'error' && summaryError && (
                    <div className="px-5 py-3">
                      <ClaudeErrorBanner error={summaryError} onDismiss={() => { setSummaryState('idle'); setSummaryError(null); }} compact provider={aiProvider} />
                    </div>
                  )}

                  {/* Idle (no Claude key or not yet triggered) */}
                  {summaryState === 'idle' && (
                    <div className="px-5 py-5 flex items-center justify-between">
                      <p className="text-sm text-bb-text-secondary">Get an AI-generated summary of the code changes</p>
                      <button onClick={handleGenerateSummary} className="btn-primary text-sm flex items-center gap-2">
                        <Sparkles size={14} />Generate
                      </button>
                    </div>
                  )}

                  {/* Done */}
                  {summaryState === 'done' && summaryData && (
                    <div className="p-5 space-y-4">
                      {/* Headline + stats row */}
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-sm font-semibold text-bb-text-primary leading-snug flex-1">
                          {summaryData.headline}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          {summaryData.complexity && (() => {
                            const c = COMPLEXITY_CONFIG[summaryData.complexity] || COMPLEXITY_CONFIG.medium;
                            return (
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${c.bg} ${c.color}`}>
                                {c.label}
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Diff stats */}
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-bb-green flex items-center gap-1">
                          <span className="font-bold">+{summaryData.linesAdded ?? 0}</span>
                          <span className="text-bb-text-secondary font-normal">added</span>
                        </span>
                        <span className="text-xs font-mono text-bb-red flex items-center gap-1">
                          <span className="font-bold">−{summaryData.linesRemoved ?? 0}</span>
                          <span className="text-bb-text-secondary font-normal">removed</span>
                        </span>
                      </div>

                      {/* Plain-language summary */}
                      <p className="text-sm text-bb-text-primary/90 leading-relaxed border-l-2 border-bb-purple/40 pl-3">
                        {summaryData.summary}
                      </p>

                      {/* Key changes */}
                      {summaryData.keyChanges?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-bb-text-secondary uppercase tracking-wider mb-2">
                            Key Changes
                          </p>
                          <ul className="space-y-1.5">
                            {summaryData.keyChanges.map((change, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-bb-text-primary">
                                <span className="text-bb-purple mt-1 shrink-0">▸</span>
                                {change}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Tech details */}
                      {summaryData.techDetails && (
                        <div className="bg-bb-dark rounded-lg p-3">
                          <p className="text-[10px] font-semibold text-bb-text-secondary uppercase tracking-wider mb-1">
                            Technical Notes
                          </p>
                          <p className="text-xs text-bb-text-primary">{summaryData.techDetails}</p>
                        </div>
                      )}

                      {/* Testing notes */}
                      {summaryData.testingNotes && (
                        <div className="bg-bb-yellow/5 border border-bb-yellow/20 rounded-lg p-3">
                          <p className="text-[10px] font-semibold text-bb-yellow uppercase tracking-wider mb-1">
                            What to Test
                          </p>
                          <p className="text-xs text-bb-text-primary">{summaryData.testingNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {activeTab === 'diff' && <DiffViewer diff={diff} />}
          {activeTab === 'comments' && (
            <div>
              <div className="card p-4 mb-6">
                <h3 className="text-sm font-semibold text-bb-text-primary mb-3">Add Comment</h3>
                <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Write a comment..." rows={3} className="input w-full resize-none mb-3" />
                <button onClick={handlePostComment} disabled={posting || !commentText.trim()} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
                  {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Post Comment
                </button>
              </div>
              <CommentsList comments={comments} />
            </div>
          )}

          {/* AI Review Tab */}
          {activeTab === 'ai-review' && (
            <div>
              {/* Not yet reviewed */}
              {reviewState === 'idle' && (
                <div className="card p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-bb-blue/10 flex items-center justify-center mx-auto mb-4">
                    <Bot size={32} className="text-bb-blue" />
                  </div>
                  <h3 className="text-lg font-semibold text-bb-text-primary mb-2">AI Code Review</h3>
                  <p className="text-sm text-bb-text-secondary mb-4 max-w-md mx-auto">
                    {aiProvider === 'claude' || aiProvider === 'claude-cli' ? 'Claude' : 'GPT'} will analyze the PR diff for bugs, security vulnerabilities, performance issues, and code quality problems.
                  </p>
                  {codebaseContext?.projectSummary ? (
                    <div className="inline-flex items-center gap-2 bg-bb-green/10 border border-bb-green/30 rounded-lg px-3 py-2 mb-5 text-xs text-bb-green">
                      <Brain size={13} />
                      Codebase indexed — review will be project-aware
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 bg-bb-elevated border border-bb-border rounded-lg px-3 py-2 mb-5 text-xs text-bb-text-secondary">
                      <Brain size={13} />
                      No codebase index — index the repo for smarter reviews
                    </div>
                  )}
                  <br />
                  <button onClick={handleAIReview} className="btn-primary inline-flex items-center gap-2">
                    <Sparkles size={16} />
                    Run AI Review
                  </button>
                </div>
              )}

              {/* Reviewing */}
              {reviewState === 'reviewing' && (
                <div className="card p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-bb-blue/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Bot size={32} className="text-bb-blue" />
                  </div>
                  <h3 className="text-lg font-semibold text-bb-text-primary mb-2">Analyzing Code Changes...</h3>
                  <p className="text-sm text-bb-text-secondary mb-4">
                    {aiProvider === 'claude-cli' ? 'Claude CLI' : aiProvider === 'claude' ? 'Claude' : 'OpenAI'} is reviewing the diff for issues
                  </p>
                  <Loader2 size={24} className="animate-spin text-bb-blue mx-auto" />
                </div>
              )}

              {/* Review done */}
              {reviewState === 'done' && reviewData && (
                <div className="space-y-4">
                  {/* Verdict Banner */}
                  <div className={`card p-5 ${reviewClean ? 'border-bb-green/40' : 'border-bb-yellow/40'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        reviewClean ? 'bg-bb-green/20' : 'bg-bb-yellow/20'
                      }`}>
                        {reviewClean ? (
                          <CheckCircle2 size={20} className="text-bb-green" />
                        ) : (
                          <AlertTriangle size={20} className="text-bb-yellow" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-sm font-semibold ${reviewClean ? 'text-bb-green' : 'text-bb-yellow'}`}>
                          {reviewClean ? 'No Issues Found — Code Looks Good!' : `${reviewData.findings.length} Issue${reviewData.findings.length > 1 ? 's' : ''} Found`}
                        </h3>
                        <p className="text-sm text-bb-text-secondary mt-1">{reviewData.summary}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {reviewData?.usedCodebaseContext && (
                          <span className="text-[10px] bg-bb-green/10 border border-bb-green/30 text-bb-green px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Brain size={10} />
                            Context-aware
                          </span>
                        )}
                        <button onClick={handleAIReview} className="btn-ghost text-xs flex items-center gap-1">
                          <Sparkles size={12} />Re-run
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* PR Overview */}
                  {reviewData.prOverview && (
                    <div className="card p-5">
                      <h3 className="text-sm font-semibold text-bb-text-primary flex items-center gap-2 mb-4">
                        <Info size={16} className="text-bb-blue" />
                        What This PR Does
                      </h3>
                      <p className="text-sm text-bb-text-primary mb-4">
                        {reviewData.prOverview.purpose}
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-bb-dark rounded-lg p-3 text-center">
                          <Tag size={14} className="text-bb-blue mx-auto mb-1.5" />
                          <p className="text-[10px] text-bb-text-secondary uppercase tracking-wider mb-0.5">Type</p>
                          <p className="text-xs font-semibold text-bb-text-primary capitalize">
                            {reviewData.prOverview.changeType?.replace('-', ' ') || 'N/A'}
                          </p>
                        </div>
                        <div className="bg-bb-dark rounded-lg p-3 text-center">
                          <Target size={14} className="text-bb-purple mx-auto mb-1.5" />
                          <p className="text-[10px] text-bb-text-secondary uppercase tracking-wider mb-0.5">Impact</p>
                          <p className="text-xs font-semibold text-bb-text-primary">
                            {reviewData.prOverview.impactArea || 'N/A'}
                          </p>
                        </div>
                        <div className="bg-bb-dark rounded-lg p-3 text-center">
                          <Gauge size={14} className={`mx-auto mb-1.5 ${
                            reviewData.prOverview.riskLevel === 'high' ? 'text-bb-red'
                              : reviewData.prOverview.riskLevel === 'medium' ? 'text-bb-yellow'
                              : 'text-bb-green'
                          }`} />
                          <p className="text-[10px] text-bb-text-secondary uppercase tracking-wider mb-0.5">Risk</p>
                          <p className={`text-xs font-semibold capitalize ${
                            reviewData.prOverview.riskLevel === 'high' ? 'text-bb-red'
                              : reviewData.prOverview.riskLevel === 'medium' ? 'text-bb-yellow'
                              : 'text-bb-green'
                          }`}>
                            {reviewData.prOverview.riskLevel || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Files Changed */}
                  {reviewData.filesChanged && reviewData.filesChanged.length > 0 && (
                    <div className="card p-5">
                      <h3 className="text-sm font-semibold text-bb-text-primary flex items-center gap-2 mb-4">
                        <FileText size={16} className="text-bb-text-secondary" />
                        Files Changed
                        <span className="text-xs text-bb-text-secondary font-normal">
                          ({reviewData.filesChanged.length})
                        </span>
                      </h3>
                      <div className="space-y-2">
                        {reviewData.filesChanged.map((fc, i) => {
                          const actionIcon = {
                            added: <FilePlus size={14} className="text-bb-green" />,
                            modified: <FileEdit size={14} className="text-bb-yellow" />,
                            deleted: <FileX size={14} className="text-bb-red" />,
                            renamed: <FileMinus size={14} className="text-bb-purple" />,
                          };
                          return (
                            <div key={i} className="flex items-start gap-3 p-3 bg-bb-dark rounded-lg">
                              <span className="shrink-0 mt-0.5">
                                {actionIcon[fc.action] || <FileEdit size={14} className="text-bb-text-secondary" />}
                              </span>
                              <div className="min-w-0">
                                <code className="text-xs text-bb-text-primary font-mono break-all">
                                  {fc.file}
                                </code>
                                <p className="text-xs text-bb-text-secondary mt-0.5">
                                  {fc.description}
                                </p>
                              </div>
                              <span className={`badge shrink-0 text-[10px] ${
                                fc.action === 'added' ? 'bg-bb-green/10 border border-bb-green/30 text-bb-green'
                                  : fc.action === 'deleted' ? 'bg-bb-red/10 border border-bb-red/30 text-bb-red'
                                  : fc.action === 'renamed' ? 'bg-bb-purple/10 border border-bb-purple/30 text-bb-purple'
                                  : 'bg-bb-yellow/10 border border-bb-yellow/30 text-bb-yellow'
                              }`}>
                                {fc.action}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Findings list */}
                  {reviewHasFindings && (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-bb-text-primary">Review Findings</h3>
                        {!findingsPosted && (
                          <div className="flex items-center gap-2 text-xs">
                            <button onClick={selectAllFindings} className="text-bb-blue hover:underline">Select all</button>
                            <span className="text-bb-text-secondary">|</span>
                            <button onClick={deselectAllFindings} className="text-bb-text-secondary hover:underline">Deselect all</button>
                          </div>
                        )}
                      </div>

                      {reviewData.findings.map((f, i) => {
                        const sev = SEVERITY_CONFIG[f.severity] || SEVERITY_CONFIG.medium;
                        const SevIcon = sev.icon;
                        const selected = selectedFindings.has(i);

                        return (
                          <div key={i} className={`card overflow-hidden ${findingsPosted ? 'opacity-70' : ''}`}>
                            <div className={`px-4 py-3 border-l-4 ${
                              f.severity === 'critical' || f.severity === 'high'
                                ? 'border-l-bb-red'
                                : f.severity === 'medium'
                                ? 'border-l-bb-yellow'
                                : 'border-l-bb-blue'
                            }`}>
                              <div className="flex items-start gap-3">
                                {!findingsPosted && (
                                  <button
                                    onClick={() => toggleFinding(i)}
                                    className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                      selected
                                        ? 'bg-bb-blue border-bb-blue text-white'
                                        : 'border-bb-border hover:border-bb-blue'
                                    }`}
                                  >
                                    {selected && <CheckCircle2 size={12} />}
                                  </button>
                                )}
                                {findingsPosted && (
                                  <MessageCircle size={16} className="text-bb-green shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <SevIcon size={14} className={`text-${sev.color}`} />
                                    <span className={`badge ${sev.bg} border text-${sev.color}`}>
                                      {f.severity?.toUpperCase()}
                                    </span>
                                    <span className="badge bg-bb-elevated border border-bb-border text-bb-text-secondary">
                                      {TYPE_LABELS[f.type] || f.type}
                                    </span>
                                    {f.file && (
                                      <code className="text-xs text-bb-text-secondary bg-bb-dark px-1.5 py-0.5 rounded truncate max-w-xs">
                                        {f.file}{f.line ? `:${f.line}` : ''}
                                      </code>
                                    )}
                                  </div>
                                  <h4 className="text-sm font-semibold text-bb-text-primary mb-1">{f.title}</h4>
                                  <p className="text-sm text-bb-text-secondary mb-2">{f.description}</p>
                                  {f.suggestion && (
                                    <div className="bg-bb-dark rounded-lg p-3 text-xs">
                                      <span className="text-bb-green font-semibold">Suggestion: </span>
                                      <span className="text-bb-text-primary">{f.suggestion}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Post findings as comments */}
                      {!findingsPosted ? (
                        <div className="card p-4 flex items-center justify-between">
                          <p className="text-sm text-bb-text-secondary">
                            {selectedFindings.size} of {reviewData.findings.length} finding{reviewData.findings.length > 1 ? 's' : ''} selected
                          </p>
                          <button
                            onClick={handlePostFindings}
                            disabled={postingFindings || selectedFindings.size === 0}
                            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
                          >
                            {postingFindings ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <MessageCircle size={14} />
                            )}
                            {postingFindings ? 'Posting...' : 'Post Selected as PR Comments'}
                          </button>
                        </div>
                      ) : (
                        <div className="card p-4 bg-bb-green/5 border-bb-green/30 flex items-center gap-3">
                          <CheckCircle2 size={18} className="text-bb-green shrink-0" />
                          <p className="text-sm text-bb-green">
                            Review comments posted to PR. You can now approve and merge.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions sidebar */}
        {isOpen && (
          <div className="w-72 shrink-0">
            <div className="card p-5 sticky top-8 space-y-4">
              <h3 className="text-sm font-bold text-bb-text-primary flex items-center gap-2">
                <Shield size={16} />
                Actions
              </h3>

              {isProd && (
                <div className="bg-bb-red/10 border border-bb-red/30 rounded-lg p-3">
                  <p className="text-xs text-bb-red flex items-start gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>Merge blocked - targets <code className="font-mono">{destBranch}</code></span>
                  </p>
                </div>
              )}

              {/* AI Review button */}
              {hasAIKey && reviewState === 'idle' && (
                <button
                  onClick={() => { handleAIReview(); }}
                  className="w-full flex items-center justify-center gap-2 text-sm bg-gradient-to-r from-bb-blue to-bb-purple text-white px-4 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  <Sparkles size={14} />
                  Run AI Review
                </button>
              )}
              {hasAIKey && reviewState === 'reviewing' && (
                <div className="w-full flex items-center justify-center gap-2 text-sm bg-bb-elevated text-bb-text-secondary px-4 py-2.5 rounded-lg">
                  <Loader2 size={14} className="animate-spin" />
                  Reviewing...
                </div>
              )}

              {/* AI Review status in sidebar */}
              {hasAIKey && reviewState === 'done' && (
                <div className={`rounded-lg p-3 ${reviewClean ? 'bg-bb-green/10 border border-bb-green/30' : findingsPosted ? 'bg-bb-green/10 border border-bb-green/30' : 'bg-bb-yellow/10 border border-bb-yellow/30'}`}>
                  <p className={`text-xs flex items-start gap-2 ${reviewClean || findingsPosted ? 'text-bb-green' : 'text-bb-yellow'}`}>
                    {reviewClean || findingsPosted ? (
                      <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    )}
                    <span>
                      {reviewClean
                        ? 'AI Review passed — no issues'
                        : findingsPosted
                        ? 'Review comments posted'
                        : `${reviewData?.findings?.length} issue${reviewData?.findings?.length > 1 ? 's' : ''} found — review before merge`}
                    </span>
                  </p>
                </div>
              )}

              {/* Approve & Merge — shown when AI review passes or not configured */}
              {canApproveAndMerge && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={approving}
                    className="btn-success w-full flex items-center justify-center gap-2 text-sm"
                  >
                    {approving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Approve PR
                  </button>

                  {!isProd && (
                    <>
                      {!showMergeConfirm ? (
                        <button
                          onClick={() => setShowMergeConfirm(true)}
                          className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                        >
                          <GitMerge size={14} />
                          Merge PR
                        </button>
                      ) : (
                        <div className="bg-bb-yellow/10 border border-bb-yellow/30 rounded-lg p-4 space-y-3">
                          <p className="text-xs text-bb-yellow flex items-start gap-2">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                            Are you sure you want to merge this PR?
                          </p>
                          <div className="flex gap-2">
                            <button onClick={handleMerge} disabled={merging} className="btn-primary flex-1 text-xs py-2 flex items-center justify-center gap-1">
                              {merging ? <Loader2 size={12} className="animate-spin" /> : 'Confirm'}
                            </button>
                            <button onClick={() => setShowMergeConfirm(false)} className="btn-ghost flex-1 text-xs py-2">Cancel</button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Hint when review needed */}
              {hasAIKey && !canApproveAndMerge && reviewState === 'done' && !findingsPosted && (
                <p className="text-[11px] text-bb-text-secondary text-center">
                  Post review comments to unlock Approve & Merge
                </p>
              )}
            </div>
          </div>
        )}

        {/* Deployment timer sidebar */}
        {!isOpen && deployTimerActive && (
          <div className="w-72 shrink-0">
            <div className="card p-5 sticky top-8 space-y-4">
              <h3 className="text-sm font-bold text-bb-text-primary flex items-center gap-2">
                <Rocket size={16} className="text-bb-purple" />
                Deployment
              </h3>
              <div className="text-center py-4">
                <p className="text-3xl font-mono font-bold text-bb-purple">{formatTimer(deployTimer)}</p>
                <p className="text-xs text-bb-text-secondary mt-2">Staging deployment in progress</p>
                <div className="mt-3 w-full bg-bb-dark rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-bb-purple rounded-full transition-all duration-1000" style={{ width: `${((16 * 60 - deployTimer) / (16 * 60)) * 100}%` }} />
                </div>
              </div>
              <button onClick={cancelDeployTimer} className="btn-ghost w-full text-xs flex items-center justify-center gap-1">
                <X size={12} />Cancel Timer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
