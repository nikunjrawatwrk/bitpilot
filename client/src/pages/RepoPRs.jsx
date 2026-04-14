import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPullRequests, getCodebaseContext, analyzeCodebase, deleteCodebaseContext } from '../api/bitbucket';
import useAutoRefresh from '../hooks/useAutoRefresh';
import PRList from '../components/PRList';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  GitPullRequest,
  GitMerge,
  XCircle,
  Timer,
  Brain,
  CheckCircle2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Code2,
  Layers,
  Package,
  Shield,
} from 'lucide-react';

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STATES = [
  { key: 'OPEN', label: 'Open', icon: GitPullRequest },
  { key: 'MERGED', label: 'Merged', icon: GitMerge },
  { key: 'DECLINED', label: 'Declined', icon: XCircle },
];

export default function RepoPRs() {
  const { repoSlug } = useParams();
  const [prs, setPrs] = useState([]);
  const [state, setState] = useState('OPEN');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Codebase context
  const [context, setContext] = useState(undefined); // undefined = not loaded yet
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [showContextDetail, setShowContextDetail] = useState(false);

  const load = useCallback(async (s) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPullRequests(repoSlug, s || state);
      setPrs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [repoSlug, state]);

  const { enabled: arEnabled, countdown } = useAutoRefresh(load);

  useEffect(() => {
    load(state);
    // Load codebase context status
    getCodebaseContext(repoSlug).then(setContext).catch(() => setContext(null));
  }, [repoSlug, state]);

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const result = await analyzeCodebase(repoSlug);
      setContext(result);
    } catch (err) {
      setAnalyzeError(err.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleDeleteContext() {
    await deleteCodebaseContext(repoSlug);
    setContext(null);
    setShowContextDetail(false);
  }

  const isIndexed = context && context.projectSummary;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/"
          className="w-9 h-9 rounded-lg bg-bb-surface border border-bb-border flex items-center justify-center hover:border-bb-blue/40 transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-bb-text-primary">{repoSlug}</h1>
          <p className="text-sm text-bb-text-secondary">Pull Requests</p>
        </div>
        <div className="flex items-center gap-3">
          {arEnabled && countdown > 0 && (
            <span className="text-xs text-bb-text-secondary flex items-center gap-1.5 bg-bb-surface border border-bb-border rounded-lg px-3 py-1.5">
              <Timer size={12} className="text-bb-green" />
              {formatCountdown(countdown)}
            </span>
          )}
          <button onClick={() => load()} disabled={loading} className="btn-ghost flex items-center gap-2">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Codebase Context Panel */}
      <div className={`mb-6 card p-4 ${isIndexed ? 'border-bb-green/30' : 'border-bb-border'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isIndexed ? 'bg-bb-green/15' : 'bg-bb-blue/10'}`}>
              <Brain size={18} className={isIndexed ? 'text-bb-green' : 'text-bb-blue'} />
            </div>
            <div>
              <p className="text-sm font-semibold text-bb-text-primary flex items-center gap-2">
                Codebase Intelligence
                {isIndexed && (
                  <span className="text-[10px] font-normal bg-bb-green/10 border border-bb-green/30 text-bb-green px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={10} />
                    Indexed · {timeAgo(context.analyzedAt)}
                    {context.indexSource?.includes('local') && ' · local files'}
                  </span>
                )}
              </p>
              <p className="text-xs text-bb-text-secondary mt-0.5">
                {isIndexed
                  ? context.projectSummary
                  : 'Index this codebase so AI reviews understand your project architecture, patterns, and conventions.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {isIndexed && (
              <>
                <button
                  onClick={() => setShowContextDetail(v => !v)}
                  className="btn-ghost text-xs flex items-center gap-1"
                >
                  {showContextDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showContextDetail ? 'Hide' : 'Details'}
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="btn-ghost text-xs flex items-center gap-1"
                  title="Re-analyze codebase"
                >
                  {analyzing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  Re-index
                </button>
                <button
                  onClick={handleDeleteContext}
                  className="text-bb-text-secondary hover:text-bb-red transition-colors p-1"
                  title="Remove codebase index"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
            {!isIndexed && (
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="btn-primary text-sm flex items-center gap-2"
              >
                {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
                {analyzing ? 'Analyzing...' : 'Index Codebase'}
              </button>
            )}
          </div>
        </div>

        {/* Analyze progress */}
        {analyzing && (
          <div className="mt-3 pt-3 border-t border-bb-border">
            <div className="flex items-center gap-2 text-xs text-bb-text-secondary">
              <Loader2 size={12} className="animate-spin text-bb-blue" />
              Scanning local project files and analyzing codebase structure...
            </div>
          </div>
        )}

        {/* Analyze error */}
        {analyzeError && (
          <div className="mt-3 pt-3 border-t border-bb-border">
            <p className="text-xs text-bb-red flex items-center gap-1.5">
              <AlertCircle size={12} />
              {analyzeError}
            </p>
          </div>
        )}

        {/* Context details */}
        {showContextDetail && isIndexed && (
          <div className="mt-4 pt-4 border-t border-bb-border space-y-3">
            {context.indexSource && (
              <p className="text-[11px] text-bb-text-secondary flex items-center gap-1.5">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${context.indexSource.includes('local') ? 'bg-bb-green' : 'bg-bb-blue'}`} />
                Indexed from: <span className="text-bb-text-primary font-mono">{context.indexSource}</span>
              </p>
            )}
          </div>
        )}
        {showContextDetail && isIndexed && (
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Code2 size={14} className="text-bb-blue mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-bb-text-secondary mb-0.5">Tech Stack</p>
                  <p className="text-xs text-bb-text-primary">
                    {[context.techStack?.language, context.techStack?.framework, context.techStack?.database]
                      .filter(Boolean).join(' · ') || 'N/A'}
                  </p>
                  {context.techStack?.other?.length > 0 && (
                    <p className="text-[11px] text-bb-text-secondary mt-0.5">{context.techStack.other.join(', ')}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Layers size={14} className="text-bb-purple mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-bb-text-secondary mb-0.5">Architecture</p>
                  <p className="text-xs text-bb-text-primary">{context.architecture?.pattern || 'N/A'}</p>
                  <p className="text-[11px] text-bb-text-secondary mt-0.5">{context.architecture?.description}</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Package size={14} className="text-bb-yellow mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-bb-text-secondary mb-0.5">Key Modules</p>
                  <div className="space-y-0.5">
                    {(context.keyModules || []).slice(0, 4).map((m, i) => (
                      <p key={i} className="text-xs text-bb-text-primary">
                        <span className="font-medium">{m.name}</span>
                        <span className="text-bb-text-secondary"> — {m.purpose}</span>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
              {context.reviewGuidelines?.length > 0 && (
                <div className="flex items-start gap-2">
                  <Shield size={14} className="text-bb-green mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-bb-text-secondary mb-0.5">Review Guidelines</p>
                    <div className="space-y-0.5">
                      {context.reviewGuidelines.slice(0, 3).map((g, i) => (
                        <p key={i} className="text-[11px] text-bb-text-secondary">· {g}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* State tabs */}
      <div className="flex items-center gap-1 mb-6 bg-bb-surface rounded-lg p-1 border border-bb-border w-fit">
        {STATES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setState(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              state === key ? 'bg-bb-blue text-white' : 'text-bb-text-secondary hover:text-bb-text-primary'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-bb-red/10 border border-bb-red/30 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertCircle size={20} className="text-bb-red shrink-0" />
          <p className="text-sm text-bb-red">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-bb-blue" />
        </div>
      )}

      {/* PR List */}
      {!loading && !error && <PRList prs={prs} repoSlug={repoSlug} />}
    </div>
  );
}
