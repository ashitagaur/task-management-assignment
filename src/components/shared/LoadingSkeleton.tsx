import React from 'react';

export interface LoadingSkeletonProps {
  viewMode?: 'board' | 'list';
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  viewMode = 'board',
  className = '',
}) => {
  if (viewMode === 'list') {
    return (
      <div
        role="status"
        aria-label="Loading task list"
        className={`w-full max-w-full min-w-0 bg-white rounded-xl border border-fb-border p-4 shadow-fb-card animate-pulse ${className}`}
      >
        {/* Table Header skeleton */}
        <div className="flex items-center justify-between border-b border-fb-border pb-3 mb-3">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
        {/* Table Rows skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3 w-1/3">
                <div className="w-4 h-4 bg-gray-200 rounded shrink-0" />
                <div className="h-3.5 bg-gray-200 rounded w-full" />
              </div>
              <div className="h-5 bg-gray-200 rounded-full w-20" />
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 bg-gray-200 rounded-full" />
                <div className="w-5 h-5 bg-gray-200 rounded-full" />
              </div>
              <div className="h-5 bg-gray-200 rounded-full w-16" />
              <div className="h-3.5 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Board skeleton: 3 Kanban columns
  return (
    <div
      role="status"
      aria-label="Loading kanban board"
      className={`w-full max-w-full min-w-0 overflow-x-auto pb-4 pt-1 [contain:paint] ${className}`}
    >
      <div className="inline-flex gap-4 min-w-full items-start px-0.5 animate-pulse">
        {[1, 2, 3].map((col) => (
          <div
            key={col}
            className="flex flex-col min-w-[280px] sm:min-w-[310px] w-[320px] max-w-[340px] shrink-0 bg-[#F0F2F6] rounded-2xl p-3 min-h-[380px]"
          >
            {/* Column Header skeleton */}
            <div className="flex items-center justify-between px-1 py-1 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                <div className="h-3.5 bg-gray-300 rounded w-20" />
                <div className="w-6 h-4 bg-gray-300 rounded-full" />
              </div>
              <div className="w-6 h-6 rounded-lg bg-gray-300" />
            </div>

            {/* Column Cards skeleton */}
            <div className="space-y-2.5">
              {[1, 2, 3].slice(0, col === 2 ? 1 : col === 3 ? 2 : 3).map((card) => (
                <div
                  key={card}
                  className="bg-white rounded-xl border border-fb-border p-3.5 shadow-fb-card space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-3 bg-gray-200 rounded w-14" />
                    <div className="w-2 h-2 rounded-full bg-gray-200" />
                  </div>
                  <div className="h-3.5 bg-gray-200 rounded w-4/5" />
                  <div className="h-3.5 bg-gray-200 rounded w-3/5" />
                  <div className="flex items-center justify-between pt-2">
                    <div className="h-5 bg-gray-200 rounded-full w-14" />
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 bg-gray-200 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
