import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { ContainerNode, ContainerType } from '../../domain/types';

export interface ContainerModalProps {
  isOpen: boolean;
  mode: 'create' | 'rename';
  targetNode: ContainerNode;
  childType?: ContainerType;
  onClose: () => void;
  onSubmit: (name: string, isPrivate?: boolean) => { success: boolean; error?: string };
}

export const ContainerModal: React.FC<ContainerModalProps> = ({
  isOpen,
  mode,
  targetNode,
  childType,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'rename') {
        setName(targetNode.name);
        setIsPrivate(Boolean(targetNode.isPrivate));
      } else {
        setName('');
        setIsPrivate(false);
      }
      setErrorMessage(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, mode, targetNode]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const title =
    mode === 'rename'
      ? `Rename ${targetNode.type.charAt(0).toUpperCase() + targetNode.type.slice(1)}`
      : `New ${childType ? childType.charAt(0).toUpperCase() + childType.slice(1) : 'Container'} in ${targetNode.name}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMessage('Container name cannot be empty');
      return;
    }

    const result = onSubmit(trimmed, isPrivate);
    if (result.success) {
      onClose();
    } else {
      setErrorMessage(result.error || 'Failed to save container');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="container-modal-title"
        className="relative w-full max-w-sm rounded-2xl bg-white border border-fb-border p-6 shadow-fb-modal z-10 animate-fadeIn"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id="container-modal-title" className="text-sm font-bold text-fb-text-primary">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-fb-text-muted hover:text-fb-text-primary hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="container-name-input"
              className="block text-xs font-semibold text-fb-text-secondary mb-1.5"
            >
              Name
            </label>
            <input
              ref={inputRef}
              id="container-name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder={`Enter ${childType || targetNode.type} name...`}
              className="w-full px-3 py-2 text-xs rounded-lg border border-fb-border bg-white text-fb-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary"
            />
          </div>

          {mode === 'create' && (
            <div className="flex items-center gap-2">
              <input
                id="container-private-checkbox"
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-fb-primary focus:ring-fb-primary border-gray-300"
              />
              <label
                htmlFor="container-private-checkbox"
                className="text-xs text-fb-text-secondary select-none"
              >
                Mark as private container
              </label>
            </div>
          )}

          {errorMessage && (
            <p role="alert" className="text-xs text-fb-danger font-medium">
              {errorMessage}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-fb-border bg-white text-xs font-medium text-fb-text-secondary hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-fb-primary hover:bg-fb-primary/90 text-white text-xs font-semibold shadow-fb-button transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-primary"
            >
              {mode === 'rename' ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
