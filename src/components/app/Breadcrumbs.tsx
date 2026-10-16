import React, { useMemo } from 'react';
import { useAppStore } from '../../store/store';
import { getBreadcrumbs } from '../../store/selectors';

export interface BreadcrumbsProps {
  activeListId: string | null;
  className?: string;
  onNavigate?: (listId: string) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  activeListId,
  className = '',
  onNavigate,
}) => {
  const fullState = useAppStore((state) => state);

  const crumbs = useMemo(() => {
    if (!activeListId) return [];
    return getBreadcrumbs(fullState, activeListId);
  }, [fullState, activeListId]);

  if (crumbs.length === 0) {
    return (
      <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-fb-text-muted ${className}`}>
        <span>Flowboard</span>
      </nav>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-fb-text-secondary ${className}`}>
      <ol className="flex items-center space-x-1.5 flex-wrap">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <React.Fragment key={crumb.id}>
              {index > 0 && (
                <li className="text-fb-text-subtle select-none px-0.5" aria-hidden="true">
                  /
                </li>
              )}
              <li className="flex items-center">
                {isLast ? (
                  <span
                    className="font-semibold text-fb-text-primary truncate max-w-[160px] sm:max-w-xs"
                    aria-current="page"
                  >
                    {crumb.name}
                  </span>
                ) : crumb.type === 'list' && onNavigate ? (
                  <button
                    type="button"
                    onClick={() => onNavigate(crumb.id)}
                    className="hover:text-fb-primary hover:underline transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-fb-primary rounded truncate max-w-[120px] sm:max-w-[160px]"
                  >
                    {crumb.name}
                  </button>
                ) : (
                  <span className="text-fb-text-secondary truncate max-w-[120px] sm:max-w-[160px]">
                    {crumb.name}
                  </span>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};
