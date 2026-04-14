import { Link } from 'react-router-dom';
import { GitPullRequest, GitMerge, XCircle, Clock, User } from 'lucide-react';

function statusBadge(state) {
  switch (state) {
    case 'OPEN':
      return <span className="badge-open"><GitPullRequest size={12} className="mr-1" />Open</span>;
    case 'MERGED':
      return <span className="badge-merged"><GitMerge size={12} className="mr-1" />Merged</span>;
    case 'DECLINED':
      return <span className="badge-declined"><XCircle size={12} className="mr-1" />Declined</span>;
    default:
      return <span className="badge bg-bb-border text-bb-text-secondary">{state}</span>;
  }
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function PRList({ prs, repoSlug, workspace }) {
  if (!prs || prs.length === 0) {
    return (
      <div className="text-center py-16 text-bb-text-secondary">
        <GitPullRequest size={48} className="mx-auto mb-4 opacity-30" />
        <p className="text-lg">No pull requests found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {prs.map((pr) => {
        const srcBranch = pr.source?.branch?.name || '?';
        const destBranch = pr.destination?.branch?.name || '?';
        const author = pr.author?.display_name || 'Unknown';
        const wsParam = workspace ? `?workspace=${workspace}` : '';

        return (
          <Link
            key={pr.id}
            to={`/repos/${repoSlug}/prs/${pr.id}${wsParam}`}
            className="card block p-4 hover:border-bb-blue/40 transition-all group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {statusBadge(pr.state)}
                  <span className="text-bb-text-secondary text-xs">
                    #{pr.id}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-bb-text-primary group-hover:text-bb-blue transition-colors truncate">
                  {pr.title}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-xs text-bb-text-secondary">
                  <span className="flex items-center gap-1">
                    <User size={12} />
                    {author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {timeAgo(pr.created_on)}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-xs">
                  <code className="bg-bb-blue/10 text-bb-blue px-2 py-0.5 rounded">
                    {srcBranch}
                  </code>
                  <span className="text-bb-text-secondary">→</span>
                  <code className="bg-bb-elevated text-bb-text-secondary px-2 py-0.5 rounded">
                    {destBranch}
                  </code>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
