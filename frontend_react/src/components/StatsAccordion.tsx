import React from 'react';
import { ChevronDown } from 'lucide-react';

interface StatsAccordionProps {
  title: string | React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const StatsAccordion: React.FC<StatsAccordionProps> = ({ 
  title, 
  children, 
  defaultOpen = false 
}) => {
  return (
    <details 
      open={defaultOpen} 
      className="group bg-[#121212]/50 border border-white/10 rounded-2xl overflow-hidden shadow-lg mb-6 transition-colors hover:border-white/20 modern-details"
    >
      <summary className="p-4 md:px-6 flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden border-b border-transparent group-open:border-white/10 group-open:bg-white/5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <div className="font-bold text-white text-lg">{title}</div>
        <div className="p-1 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
          <ChevronDown className="w-5 h-5 text-neutral-400 group-open:rotate-180 transition-transform duration-300" />
        </div>
      </summary>
      
      {/* Fallback Grid Wrapper para animación suave universal */}
      <div className="accordion-grid-wrapper bg-black/20">
        <div className="accordion-grid-inner">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </div>
      </div>
    </details>
  );
};
