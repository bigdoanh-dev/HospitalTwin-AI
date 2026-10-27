import React, { useEffect, useState } from 'react';
import { Users, Clock, Timer, CheckCircle2, Activity } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar } from 'recharts';
import { motion, useReducedMotion } from 'framer-motion';
import { KPICardData } from '../types/hospital';

interface KPIRowProps {
  kpis?: KPICardData[];
}

// Animated Counter component with prefers-reduced-motion check
function AnimatedValue({ value }: { value: string | number }) {
  const reducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState<string | number>(value);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayValue(value);
      return;
    }

    // If numeric string or number, animate count-up
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, ''));
    if (!isNaN(num) && num > 0) {
      const duration = 600; // ms
      const steps = 20;
      const stepDuration = duration / steps;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        const current = Math.round((num * step) / steps * 10) / 10;
        const suffix = typeof value === 'string' && value.includes('phút') ? ' phút'
                     : typeof value === 'string' && value.includes('%') ? '%'
                     : typeof value === 'string' && value.includes('người') ? ' người' : '';
        setDisplayValue(`${current}${suffix}`);

        if (step >= steps) {
          clearInterval(timer);
          setDisplayValue(value);
        }
      }, stepDuration);

      return () => clearInterval(timer);
    } else {
      setDisplayValue(value);
    }
  }, [value, reducedMotion]);

  return <span>{displayValue}</span>;
}

export const KPIRow: React.FC<KPIRowProps> = ({ kpis }) => {
  const reducedMotion = useReducedMotion();

  // If no KPIs provided or still loading, render clean skeletons (strictly NO fake fallback values)
  if (!kpis || kpis.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200/80 p-4 h-24 animate-pulse flex items-center justify-between"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 bg-slate-100 rounded-xl" />
              <div className="space-y-2">
                <div className="w-24 h-3 bg-slate-100 rounded" />
                <div className="w-16 h-6 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="w-16 h-9 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const cardConfig = [
    { icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', barColor: '#2563eb' },
    { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', barColor: '#d97706' },
    { icon: Timer, color: 'text-sky-600', bg: 'bg-sky-50', barColor: '#0284c7' },
    { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', barColor: '#059669' }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4 mb-4">
      {kpis.map((kpi, idx) => {
        const config = cardConfig[idx % cardConfig.length];
        const Icon = config.icon;
        const hasSparks = Array.isArray(kpi.sparkline) && kpi.sparkline.length > 0;
        const chartData = hasSparks ? kpi.sparkline.map((v, i) => ({ val: v, id: i })) : [];

        const valueStr = String(kpi.value ?? '—');
        const isTimeOrPercent = valueStr.includes('phút') || valueStr.includes('%');

        return (
          <motion.div
            key={kpi.id || idx}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className="bg-white rounded-2xl border border-slate-200/90 p-3.5 lg:p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition-shadow min-w-0"
          >
            <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
              <div className={`w-10 h-10 lg:w-11 lg:h-11 rounded-xl ${config.bg} flex items-center justify-center ${config.color} shrink-0`}>
                <Icon className="w-5 h-5" strokeWidth={2} />
              </div>

              <div className="min-w-0 flex-1">
                <span className="text-[11px] lg:text-xs font-medium text-slate-500 block truncate" title={kpi.title}>
                  {kpi.title}
                </span>

                <div className="flex flex-wrap items-baseline gap-x-2 mt-0.5">
                  <span className={`font-black text-slate-900 tracking-tight whitespace-nowrap ${
                    isTimeOrPercent ? 'text-lg lg:text-xl' : 'text-xl lg:text-2xl'
                  }`}>
                    <AnimatedValue value={kpi.value} />
                  </span>

                  {kpi.delta && (
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded whitespace-nowrap">
                      {kpi.delta}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Sparkline chart strictly from API props, NO invented arrays */}
            <div className="w-14 sm:w-16 lg:w-20 h-9 shrink-0 flex items-center justify-center">
              {hasSparks ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                    <Bar dataKey="val" fill={config.barColor} radius={[2, 2, 0, 0]} opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-[10px] text-slate-300 font-mono">
                  —
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
