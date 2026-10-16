import React from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { ContainerNode } from '../../domain/types';
import { useAppStore } from '../../store/store';

export interface RestrictedCardProps {
  /** The container node that is restricted, if known */
  targetContainer?: ContainerNode | null;
  /** Name of the ancestor or target path */
  containerName?: string;
  /** Fallback list to navigate to */
  fallbackList?: ContainerNode | null;
  /** Navigation callback */
  onNavigate: (listId: string) => void;
}

/**
 * 403 Forbidden Restricted Card (Figma Node 1:882, Screenshot 4)
 * Displayed when a user directly navigates to a container/list they are not authorized to view.
 */
export const RestrictedCard: React.FC<RestrictedCardProps> = ({
  targetContainer,
  containerName,
  fallbackList,
  onNavigate,
}) => {
  const activeUserId = useAppStore((state) => state.activeUserId);
  const usersById = useAppStore((state) => state.usersById);
  const currentUser = usersById[activeUserId];

  const firstName = currentUser ? currentUser.name.split(' ')[0] : 'You';
  const pronoun =
    currentUser?.id === 'user-bob'
      ? 'him'
      : currentUser?.id === 'user-carol'
      ? 'her'
      : 'you';

  const displayName = targetContainer?.name || containerName || 'this resource';

  return (
    <div
      role="alert"
      aria-label="Access Restricted"
      className="w-full max-w-[680px] min-h-[420px] mx-auto my-8 p-8 sm:p-10 bg-white rounded-2xl border border-fb-border shadow-fb-modal text-center flex flex-col justify-center items-center animate-fadeIn"
    >
      {/* Icon Graphic */}
      <div className="w-20 h-20 rounded-full bg-fb-primary-soft flex items-center justify-center mx-auto mb-6 text-fb-primary">
        <Lock className="w-9 h-9 stroke-[1.75]" aria-hidden="true" />
      </div>

      {/* Heading & Subtitle */}
      <h2 className="text-2xl font-bold text-fb-text-primary mb-2 tracking-tight">
        Access is intentionally restricted
      </h2>
      <p className="text-xs sm:text-sm text-fb-text-secondary max-w-md mx-auto mb-6 leading-relaxed">
        {firstName} can only see resources explicitly granted to {pronoun}. Permission checks are
        enforced in selectors and store mutations.
      </p>

      {/* Sub-banner Warning Box (Figma Node 1:882 sub-banner) */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-4 mb-6 text-left w-full max-w-md">
        <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-0.5">
          403 · FORBIDDEN
        </span>
        <p className="text-xs text-amber-900 leading-normal">
          You don&apos;t have permission to open {displayName}.
        </p>
      </div>

      {/* Return to accessible content CTA */}
      {fallbackList && (
        <button
          type="button"
          onClick={() => onNavigate(fallbackList.id)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-fb-primary hover:bg-fb-primary/90 text-white text-xs font-semibold shadow-fb-button transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary focus-visible:ring-offset-2"
        >
          <span>Go to my workspace</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
