import { MessageSquare, File, User, Clock } from 'lucide-react';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function CommentsList({ comments }) {
  if (!comments || comments.length === 0) {
    return (
      <div className="text-center py-12 text-bb-text-secondary">
        <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
        <p>No comments yet</p>
      </div>
    );
  }

  // Sort by date, newest first
  const sorted = [...comments].sort(
    (a, b) => new Date(b.created_on) - new Date(a.created_on)
  );

  return (
    <div className="space-y-3">
      {sorted.map((comment) => {
        const author = comment.user?.display_name || 'Unknown';
        const isInline = !!comment.inline;
        const filePath = comment.inline?.path;
        const lineNum = comment.inline?.to || comment.inline?.from;

        return (
          <div key={comment.id} className="card p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-bb-blue/20 flex items-center justify-center shrink-0">
                <User size={14} className="text-bb-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-bb-text-primary">
                    {author}
                  </span>
                  <span className="text-xs text-bb-text-secondary flex items-center gap-1">
                    <Clock size={10} />
                    {timeAgo(comment.created_on)}
                  </span>
                </div>
                {isInline && (
                  <div className="flex items-center gap-1.5 mb-2 text-xs text-bb-text-secondary">
                    <File size={12} />
                    <code className="bg-bb-elevated px-1.5 py-0.5 rounded">
                      {filePath}
                    </code>
                    {lineNum && (
                      <span className="text-bb-yellow">line {lineNum}</span>
                    )}
                  </div>
                )}
                <div className="text-sm text-bb-text-primary/90 whitespace-pre-wrap">
                  {comment.content?.raw || comment.content?.markup || ''}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
