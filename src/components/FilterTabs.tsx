import { cn } from '@/lib/utils';
import { ChannelTag } from '@/lib/youtube';

export type FilterValue = 'all' | ChannelTag;

interface FilterTabsProps {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
}

const filters: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'Mind' },
  { value: 'marmegint', label: 'Már megint?' },
  { value: 'marmegint_jatszunk', label: 'Már megint játszunk?' },
];

export const FilterTabs = ({ value, onChange }: FilterTabsProps) => {
  return (
    <div className="bg-neutral-950/60 border border-white/10 backdrop-blur-xl inline-flex p-1.5 rounded-full shadow-lg">
      {filters.map((filter) => {
        const isActive = value === filter.value;
        return (
          <button
            key={filter.value}
            onClick={() => onChange(filter.value)}
            className={cn(
              'px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 cursor-pointer active:scale-95',
              isActive
                ? filter.value === 'marmegint'
                  ? 'bg-[#5c9884] text-white shadow-[0_0_20px_rgba(92,152,132,0.4)]'
                  : filter.value === 'marmegint_jatszunk'
                    ? 'bg-[#b0223b] text-white shadow-[0_0_20px_rgba(176,34,59,0.4)]'
                    : 'bg-white/15 text-white border border-white/20 shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            )}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
};
