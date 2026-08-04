import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string | number;
    unit?: string;
    icon: LucideIcon;
    colorClass: string;
    status?: 'STABLE' | 'WARNING' | 'DANGER';
}

export const MetricCard: React.FC<MetricCardProps> = ({ 
    title, 
    value, 
    unit, 
    icon: Icon, 
    colorClass,
    status = 'STABLE'
}) => {
    
    let borderClass = 'border-white/10';
    let bgClass = 'bg-[#121212]';
    let pulseClass = '';

    if (status === 'WARNING') {
        borderClass = 'border-amber-500/50';
        bgClass = 'bg-amber-950/20';
        pulseClass = 'animate-pulse';
    } else if (status === 'DANGER') {
        borderClass = 'border-red-500/50';
        bgClass = 'bg-red-950/20';
        pulseClass = 'animate-pulse';
    }

    return (
        <div className={`flex items-center space-x-4 p-6 rounded-2xl border ${borderClass} ${bgClass} shadow-xl transition-all duration-300 relative overflow-hidden`}>
            {/* Status indicator line */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${status === 'STABLE' ? 'bg-transparent' : (status === 'WARNING' ? 'bg-amber-500' : 'bg-red-500')}`}></div>

            <div className={`p-4 rounded-xl bg-black/40 border border-white/5 shadow-inner ${colorClass} ${pulseClass}`}>
                <Icon size={32} />
            </div>
            
            <div className="flex flex-col">
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mb-1">{title}</p>
                <div className="flex items-baseline space-x-1">
                    <span className="text-4xl font-black text-white tracking-tighter" style={{ textShadow: '0 0 20px rgba(255,255,255,0.1)' }}>
                        {value}
                    </span>
                    {unit && <span className="text-lg text-neutral-500 font-bold">{unit}</span>}
                </div>
            </div>
        </div>
    );
};
