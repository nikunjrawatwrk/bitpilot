import React, { useState } from 'react';
import { ChevronDown, ChevronRight, File, Plus, Minus } from 'lucide-react';

function parseDiff(diffText) {
  if (!diffText) return [];
  const files = [];
  const fileChunks = diffText.split(/^diff --git /m).filter(Boolean);

  for (const chunk of fileChunks) {
    const lines = chunk.split('\n');
    const headerMatch = lines[0]?.match(/a\/(.+?) b\/(.+)/);
    const fileName = headerMatch ? headerMatch[2] : 'unknown';

    let additions = 0;
    let deletions = 0;
    const hunks = [];
    let currentHunk = null;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        const match = line.match(
          /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/
        );
        currentHunk = {
          header: line,
          oldStart: match ? parseInt(match[1]) : 0,
          newStart: match ? parseInt(match[2]) : 0,
          context: match ? match[3]?.trim() : '',
          lines: [],
        };
        hunks.push(currentHunk);
      } else if (currentHunk) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          currentHunk.lines.push({ type: 'add', content: line.slice(1) });
          additions++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          currentHunk.lines.push({ type: 'del', content: line.slice(1) });
          deletions++;
        } else if (line.startsWith(' ') || line === '') {
          currentHunk.lines.push({ type: 'context', content: line.slice(1) });
        }
      }
    }

    files.push({ fileName, hunks, additions, deletions });
  }

  return files;
}

function FileHeader({ file, expanded, onToggle }) {
  const total = file.additions + file.deletions;
  const addPct = total > 0 ? (file.additions / total) * 100 : 0;

  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 bg-bb-elevated hover:bg-bb-elevated/80 transition-colors text-left"
    >
      {expanded ? (
        <ChevronDown size={16} className="text-bb-text-secondary shrink-0" />
      ) : (
        <ChevronRight size={16} className="text-bb-text-secondary shrink-0" />
      )}
      <File size={14} className="text-bb-text-secondary shrink-0" />
      <span className="text-sm font-mono text-bb-text-primary truncate flex-1">
        {file.fileName}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        {file.additions > 0 && (
          <span className="text-xs text-bb-green flex items-center gap-0.5">
            <Plus size={12} />
            {file.additions}
          </span>
        )}
        {file.deletions > 0 && (
          <span className="text-xs text-bb-red flex items-center gap-0.5">
            <Minus size={12} />
            {file.deletions}
          </span>
        )}
        <div className="w-16 h-2 bg-bb-dark rounded-full overflow-hidden">
          <div
            className="h-full bg-bb-green rounded-full"
            style={{ width: `${addPct}%` }}
          />
        </div>
      </div>
    </button>
  );
}

export default function DiffViewer({ diff }) {
  const files = parseDiff(diff);
  const [expanded, setExpanded] = useState(() =>
    Object.fromEntries(files.map((_, i) => [i, true]))
  );

  if (!diff) {
    return (
      <div className="text-center py-12 text-bb-text-secondary">
        No diff available
      </div>
    );
  }

  const totalAdd = files.reduce((s, f) => s + f.additions, 0);
  const totalDel = files.reduce((s, f) => s + f.deletions, 0);

  return (
    <div>
      <div className="flex items-center gap-4 mb-4 text-sm text-bb-text-secondary">
        <span>{files.length} file{files.length !== 1 ? 's' : ''} changed</span>
        <span className="text-bb-green">+{totalAdd}</span>
        <span className="text-bb-red">-{totalDel}</span>
      </div>
      <div className="space-y-3">
        {files.map((file, fi) => (
          <div key={fi} className="card overflow-hidden">
            <FileHeader
              file={file}
              expanded={expanded[fi]}
              onToggle={() =>
                setExpanded((p) => ({ ...p, [fi]: !p[fi] }))
              }
            />
            {expanded[fi] && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono border-collapse">
                  <tbody>
                    {file.hunks.map((hunk, hi) => {
                      let oldLine = hunk.oldStart;
                      let newLine = hunk.newStart;
                      return (
                        <React.Fragment key={hi}>
                          <tr className="diff-hunk">
                            <td
                              colSpan={3}
                              className="px-4 py-1.5 text-xs font-mono"
                            >
                              {hunk.header}
                            </td>
                          </tr>
                          {hunk.lines.map((line, li) => {
                            let oNum = '';
                            let nNum = '';
                            if (line.type === 'context') {
                              oNum = oldLine++;
                              nNum = newLine++;
                            } else if (line.type === 'add') {
                              nNum = newLine++;
                            } else if (line.type === 'del') {
                              oNum = oldLine++;
                            }
                            return (
                              <tr
                                key={li}
                                className={
                                  line.type === 'add'
                                    ? 'diff-add'
                                    : line.type === 'del'
                                    ? 'diff-del'
                                    : ''
                                }
                              >
                                <td className="w-12 text-right pr-2 pl-4 select-none text-bb-text-secondary/50 border-r border-bb-border/30">
                                  {oNum}
                                </td>
                                <td className="w-12 text-right pr-2 pl-2 select-none text-bb-text-secondary/50 border-r border-bb-border/30">
                                  {nNum}
                                </td>
                                <td className="pl-4 pr-4 py-0 whitespace-pre">
                                  <span
                                    className={
                                      line.type === 'add'
                                        ? 'text-bb-green'
                                        : line.type === 'del'
                                        ? 'text-bb-red'
                                        : 'text-bb-text-primary'
                                    }
                                  >
                                    {line.type === 'add'
                                      ? '+'
                                      : line.type === 'del'
                                      ? '-'
                                      : ' '}
                                    {line.content}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
