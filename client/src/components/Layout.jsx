import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  GitPullRequest,
  LayoutDashboard,
  Search,
  Settings,
  ExternalLink,
} from 'lucide-react';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [prUrl, setPrUrl] = useState('');

  function handleUrlSubmit(e) {
    e.preventDefault();
    const match = prUrl.match(
      /bitbucket\.org\/([^/]+)\/([^/]+)\/pull-requests\/(\d+)/
    );
    if (match) {
      const [, , repo, id] = match;
      navigate(`/repos/${repo}/prs/${id}?workspace=${match[1]}&autoReview=1`);
      setPrUrl('');
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-bb-surface border-r border-bb-border flex flex-col shrink-0">
        <div className="p-5 border-b border-bb-border">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-bb-blue rounded-lg flex items-center justify-center">
              <GitPullRequest size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-bb-text-primary leading-tight">
                BB PR Reviewer
              </h1>
              <p className="text-[10px] text-bb-text-secondary">
                Bitbucket Pull Requests
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <Link
            to="/"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              location.pathname === '/'
                ? 'bg-bb-blue/10 text-bb-blue'
                : 'text-bb-text-secondary hover:text-bb-text-primary hover:bg-bb-elevated'
            }`}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </Link>
          <Link
            to="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              location.pathname === '/settings'
                ? 'bg-bb-blue/10 text-bb-blue'
                : 'text-bb-text-secondary hover:text-bb-text-primary hover:bg-bb-elevated'
            }`}
          >
            <Settings size={18} />
            Configuration
          </Link>
        </nav>

        <div className="p-3 border-t border-bb-border">
          <form onSubmit={handleUrlSubmit}>
            <label className="text-[10px] uppercase tracking-wider text-bb-text-secondary font-semibold mb-2 block">
              Quick Review
            </label>
            <div className="relative">
              <input
                type="text"
                value={prUrl}
                onChange={(e) => setPrUrl(e.target.value)}
                placeholder="Paste PR URL..."
                className="input w-full text-xs pr-8"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-bb-text-secondary hover:text-bb-blue"
              >
                <ExternalLink size={14} />
              </button>
            </div>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
