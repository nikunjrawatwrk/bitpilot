import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getRepos, getConfig } from '../api/bitbucket';
import useAutoRefresh from '../hooks/useAutoRefresh';
import {
  FolderGit2,
  GitPullRequest,
  Search,
  Loader2,
  AlertCircle,
  Globe,
  RefreshCw,
  Timer,
} from 'lucide-react';

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Dashboard() {
  const [repos, setRepos] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfg, repoList] = await Promise.all([getConfig(), getRepos()]);
      setConfig(cfg);
      setRepos(repoList);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const { enabled: arEnabled, countdown } = useAutoRefresh(load);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = repos.filter(
    (r) =>
      r.slug?.toLowerCase().includes(search.toLowerCase()) ||
      r.project?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-bb-text-primary">
            Repositories
          </h1>
          <p className="text-sm text-bb-text-secondary mt-1">
            {config ? (
              <>
                Workspace:{' '}
                <span className="text-bb-blue font-mono">
                  {config.workspace}
                </span>
              </>
            ) : (
              'Loading...'
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {arEnabled && countdown > 0 && (
            <span className="text-xs text-bb-text-secondary flex items-center gap-1.5 bg-bb-surface border border-bb-border rounded-lg px-3 py-1.5">
              <Timer size={12} className="text-bb-green" />
              {formatCountdown(countdown)}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="btn-ghost flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-bb-text-secondary"
        />
        <input
          type="text"
          placeholder="Search repositories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-full pl-11"
        />
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

      {/* Repo Grid */}
      {!loading && !error && (
        <>
          <p className="text-sm text-bb-text-secondary mb-4">
            {filtered.length} repositor{filtered.length !== 1 ? 'ies' : 'y'}
            {search && ` matching "${search}"`}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((repo) => (
              <Link
                key={repo.uuid}
                to={`/repos/${repo.slug}/prs`}
                className="card p-5 hover:border-bb-blue/40 transition-all group"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-bb-elevated flex items-center justify-center shrink-0">
                    <FolderGit2
                      size={20}
                      className="text-bb-text-secondary group-hover:text-bb-blue transition-colors"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-bb-text-primary group-hover:text-bb-blue transition-colors truncate">
                      {repo.slug}
                    </h3>
                    {repo.project?.name && (
                      <p className="text-xs text-bb-text-secondary mt-0.5">
                        {repo.project.name}
                      </p>
                    )}
                  </div>
                </div>
                {repo.description && (
                  <p className="text-xs text-bb-text-secondary line-clamp-2 mb-3">
                    {repo.description}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-bb-text-secondary">
                  {repo.language && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-bb-yellow" />
                      {repo.language}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Globe size={12} />
                    {repo.is_private ? 'Private' : 'Public'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
