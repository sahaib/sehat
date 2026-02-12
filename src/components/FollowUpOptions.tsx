'use client';

import { FollowUpOption } from '@/types';

interface FollowUpOptionsProps {
  options: FollowUpOption[];
  onSelect: (value: string) => void;
  disabled: boolean;
}

export default function FollowUpOptions({
  options,
  onSelect,
  disabled,
}: FollowUpOptionsProps) {
  return (
    <div className="flex flex-wrap gap-2 mt-3" role="group" aria-label="Quick answer options">
      {options.map((option, i) => (
        <button
          key={`${option.value}-${i}`}
          onClick={() => onSelect(option.value)}
          disabled={disabled}
          className="px-3.5 py-1.5 text-sm font-medium rounded-full
                     bg-teal-50/80 text-teal-700 border border-teal-200/60
                     backdrop-blur-sm
                     hover:bg-teal-100 hover:border-teal-300 hover:shadow-sm
                     active:scale-95
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-teal-50/80
                     transition-all duration-150"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
