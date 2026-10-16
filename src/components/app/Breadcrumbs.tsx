import React, { useMemo } from 'react';
import { useAppStore } from '../../store/store';
import { getBreadcrumbs } from '../../store/selectors';
import { RouteState } from '../../hooks/useActiveList';

export interface BreadcrumbsProps {
  activeListId: string | null;
  routeState?: RouteState;
  className?: string;
  onNavigate?: (listId: string) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  activeListId,
  routeState = 'access',
  className = '',
  onNavigate,
}) => {
  const fullState = useAppStore((state) => state);

  const crumbs = useMemo(() => {
    if (!activeListId || routeState !== 'access') return [];
    return getBreadcrumbs(fullState, activeListId).filter((c) => c.type !== 'workspace');
  }, [fullState, activeListId, routeState]);

  // Neutral state: 404 Page Not Found
  if (routeState === 'not-found') {
    return (
      <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-fb-text-muted ${className}`}>
        <span className="font-semibold text-fb-text-secondary" aria-current="page">
          Page not found
        </span>
      </nav>
    );
  }

  // Neutral state: 403 Forbidden / Restricted (does not leak hierarchy)
  if (routeState === 'forbidden') {
    return (
      <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-fb-text-muted ${className}`}>
        <span className="font-semibold text-fb-text-secondary" aria-current="page">
          Restricted
        </span>
      </nav>
    );
  }

  // Neutral state: No Accessible Lists
  if (routeState === 'no-visible-lists' || crumbs.length === 0) {
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
