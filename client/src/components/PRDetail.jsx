import {
  GitPullRequest,
  GitMerge,
  User,
  Calendar,
  GitBranch,
  AlertTriangle,
  FileText,
} from 'lucide-react';

function isProductionBranch(branchName) {
  if (!branchName) return false;
  const lower = branchName.toLowerCase();
  return (
    lower === 'production' ||
    lower === 'prod' ||
    lower === 'main-production' ||
    lower.includes('production')
  );
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PRDetail({ pr }) {
  if (!pr) return null;

  const srcBranch = pr.source?.branch?.name || '?';
  const destBranch = pr.destination?.branch?.name || '?';
  const author = pr.author?.display_name || 'Unknown';
  const isProd = isProductionBranch(destBranch);

  return (
    <div>
      {isProd && (
        <div className="bg-bb-red/10 border border-bb-red/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle size={20} className="text-bb-red shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-bb-red">
              Production Branch Target
            </p>
            <p className="text-xs text-bb-red/80 mt-1">
              This PR targets <code className="font-mono">{destBranch}</code>.
              Merging to production branches is blocked as a safety measure.
              Please merge this manually if needed.
            </p>
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-full bg-bb-blue/20 flex items-center justify-center shrink-0">
            <GitPullRequest size={20} className="text-bb-blue" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-bb-text-primary">
              {pr.title}
            </h2>
            <div className="flex items-center gap-3 mt-2 text-sm text-bb-text-secondary">
              <span className="flex items-center gap-1">
                <User size={14} />
                {author}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {formatDate(pr.created_on)}
              </span>
              <span
                className={`badge ${
                  pr.state === 'OPEN'
                    ? 'badge-open'
                    : pr.state === 'MERGED'
                    ? 'badge-merged'
                    : 'badge-declined'
                }`}
              >
                {pr.state}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6 p-3 bg-bb-dark rounded-lg">
          <GitBranch size={16} className="text-bb-text-secondary" />
          <code className="bg-bb-blue/10 text-bb-blue px-3 py-1 rounded text-sm">
            {srcBranch}
          </code>
          <span className="text-bb-text-secondary">→</span>
          <code
            className={`px-3 py-1 rounded text-sm ${
              isProd
                ? 'bg-bb-red/10 text-bb-red'
                : 'bg-bb-elevated text-bb-text-secondary'
            }`}
          >
            {destBranch}
          </code>
        </div>

        {pr.description && (
          <div>
            <h3 className="text-sm font-semibold text-bb-text-secondary flex items-center gap-2 mb-3">
              <FileText size={14} />
              Description
            </h3>
            <div className="text-sm text-bb-text-primary/90 whitespace-pre-wrap bg-bb-dark rounded-lg p-4">
              {pr.description}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
