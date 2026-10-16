import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useAppStore } from '../../store/store';
import { Avatar } from '../shared/Avatar';

export const UserSwitcher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const usersById = useAppStore((state) => state.usersById);
  const activeUserId = useAppStore((state) => state.activeUserId);
  const taskMutationInFlight = useAppStore((state) => state.taskMutationInFlight);
  const setActiveUser = useAppStore((state) => state.setActiveUser);

  const currentUser = usersById[activeUserId] || {
    id: activeUserId,
    name: 'Unknown User',
    role: 'member',
    initials: '??',
    email: '',
  };

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectUser = (userId: string) => {
    if (userId === activeUserId) {
      setIsOpen(false);
      return;
    }

    const result = setActiveUser(userId);
    if (result.success) {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id="user-switcher-button"
        disabled={taskMutationInFlight}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'user-switcher-panel' : undefined}
        aria-label={`Current user: ${currentUser.name}, role ${currentUser.role}. Click to switch user.`}
        title={
          taskMutationInFlight
            ? 'User switching is disabled while a task mutation is in progress'
            : 'Switch user perspective'
        }
        className={`h-[38px] flex items-center gap-2.5 px-3 rounded-lg border border-fb-border bg-white text-fb-text-primary text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary ${
          taskMutationInFlight
            ? 'opacity-60 cursor-not-allowed bg-gray-50'
            : 'hover:bg-gray-50 active:bg-gray-100 cursor-pointer shadow-sm'
        }`}
      >
        <Avatar initials={currentUser.initials} name={currentUser.name} size="sm" />
        <div className="flex flex-col text-left justify-center leading-tight">
          <span className="font-semibold text-fb-text-primary truncate max-w-[100px] sm:max-w-[120px] text-xs leading-none">
            {currentUser.name.split(' ')[0]}
          </span>
          <span className="text-[10px] text-fb-text-muted capitalize leading-none mt-0.5">
            {currentUser.role}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-fb-text-muted transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          id="user-switcher-panel"
          aria-label="User selection panel"
          className="absolute right-0 mt-1.5 w-60 rounded-xl bg-white border border-fb-border shadow-fb-modal py-1.5 z-50 focus:outline-none"
        >
          <div className="px-3 py-1.5 border-b border-fb-border text-[11px] font-semibold uppercase tracking-wider text-fb-text-muted">
            Switch Perspective
          </div>
          <div className="py-1">
            {Object.values(usersById).map((user) => {
              const isSelected = user.id === activeUserId;

              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelectUser(user.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-fb-primary-soft/40 focus:bg-fb-primary-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary ${
                    isSelected ? 'bg-fb-primary-soft/20 font-semibold' : 'text-fb-text-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={user.initials} name={user.name} size="sm" />
                    <div className="flex flex-col leading-tight">
                      <span className="text-fb-text-primary font-medium">{user.name}</span>
                      <span className="text-[10px] text-fb-text-muted capitalize">
                        {user.role} · {user.email}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-fb-primary ml-2 shrink-0" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
