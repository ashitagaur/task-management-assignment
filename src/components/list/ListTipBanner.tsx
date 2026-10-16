import React from 'react';
import { Sparkles } from 'lucide-react';

export const ListTipBanner: React.FC = () => {
  return (
    <aside
      aria-label="Dense list productivity tip"
      className="mt-6 p-4 rounded-xl bg-[#F8F7FF] border border-[#E3DFFF] flex items-center gap-3.5 text-xs select-none w-full max-w-full min-w-0"
    >
      <div className="w-7 h-7 rounded-full bg-fb-primary-soft text-fb-primary flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="font-semibold text-fb-text-primary">
          Dense by design
        </span>
        <p className="text-[11px] text-fb-text-secondary mt-0.5 leading-relaxed">
          Flowboard's dense table layout prioritizes rapid scannability, priority sorting, and immediate drawer triage across engineering sprint backlogs.
        </p>
      </div>
    </aside>
  );
};
