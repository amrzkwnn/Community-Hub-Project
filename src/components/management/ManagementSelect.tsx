'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  badge?: string | number;
}

interface ManagementSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel?: string;
  containerClassName?: string;
  className?: string;
}

/**
 * ManagementSelect
 * Enterprise-grade, overflow-safe select component.
 * - Prevents CSS Grid / Flexbox intrinsic size blowouts with min-w-0 and max-w-full.
 * - Safely truncates long text in both English and Bahasa Melayu.
 * - Guarantees proper clearance for the chevron icon with appearance-none and pr-8.
 * - Fully compatible with UI Scale (90%, 100%, 110%) and Dark/Light modes.
 * - Provides native tooltip via title attribute when text is truncated.
 * - Strictly emoji-free.
 */
export default function ManagementSelect({
  value,
  onChange,
  options,
  ariaLabel,
  containerClassName = '',
  className = '',
  disabled = false,
  ...rest
}: ManagementSelectProps) {
  const currentOption = options.find((opt) => opt.value === value);
  const currentLabel = currentOption ? currentOption.label : '';

  return (
    <div className={`relative min-w-0 w-full ${containerClassName}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel || currentLabel}
        title={currentLabel}
        disabled={disabled}
        className={`w-full min-w-0 max-w-full h-9 sm:h-10 pl-3 pr-8 text-xs font-semibold rounded-xl appearance-none truncate border transition-all cursor-pointer outline-none bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 focus:ring-2 focus:ring-[#9E1315]/20 focus:border-[#9E1315] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        {...rest}
      >
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1.5"
          >
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" />
    </div>
  );
}
