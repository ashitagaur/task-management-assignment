import React from 'react';
import { Compass, ArrowRight } from 'lucide-react';
import { ContainerNode } from '../../domain/types';

export interface NotFoundCardProps {
  /** Fallback list to navigate to */
  fallbackList?: ContainerNode | null;
  /** Navigation callback */
  onNavigate: (listId: string) => void;
}

/**
 * 404 Not Found Card
 * Rendered when a route does not resolve to an existing, unarchived list container.
 * Adheres to Flowboard design system and visual language of RestrictedCard.
 */
export const NotFoundCard: React.FC<NotFoundCardProps> = ({
  fallbackList,
  onNavigate,
}) => {
  return (
    <div
      role="status"
      aria-label="Page Not Found"
      className="w-full max-w-[680px] min-h-[420px] mx-auto my-8 p-8 sm:p-10 bg-white rounded-2xl border border-fb-border shadow-fb-modal text-center flex flex-col justify-center items-center animate-fadeIn"
    >
      {/* Icon Graphic */}
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6 text-gray-500">
        <Compass className="w-9 h-9 stroke-[1.75]" aria-hidden="true" />
      </div>

      {/* Heading & Subtitle */}
      <h2 className="text-2xl font-bold text-fb-text-primary mb-2 tracking-tight">
        Sorry, we can&apos;t find that page.
      </h2>
      <p className="text-xs sm:text-sm text-fb-text-secondary max-w-md mx-auto mb-8 leading-relaxed">
        The address you entered isn&apos;t a functioning page in Flowboard. It may be incorrect or the resource may no longer exist.
      </p>

      {/* Primary CTA */}
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
