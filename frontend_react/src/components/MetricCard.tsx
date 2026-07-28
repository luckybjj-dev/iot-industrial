import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string | number;
    unit?: string;
    icon: LucideIcon;
    colorClass: string;
    highlight?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({ 
    title, 
    value, 
    unit, 
    icon: Icon, 
    colorClass,
    highlight = false 
}) => {
    return (
        <div className={`glass-card flex items-center space-x-4 ${highlight ? 'ring-2 ring-emerald-500/50' : ''}`}>
            <div className={`p-4 rounded-xl bg-white/5 border border-white/10 ${colorClass}`}>
                <Icon size={28} />
            </div>
            <div>
                <p className="text-sm text-neutral-400 font-medium uppercase tracking-wider">{title}</p>
                <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
                    {unit && <span className="text-lg text-neutral-500">{unit}</span>}
                </div>
            </div>
        </div>
    );
};
