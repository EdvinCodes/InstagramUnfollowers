import React from 'react';
import { t } from '../i18n/i18n';

interface StatsChartProps {
  detected: number;
  cleaned: number;
  whitelisted: number;
  cancelled?: number;
}

export const StatsChart = ({ detected, cleaned, whitelisted, cancelled = 0 }: StatsChartProps) => {
  const total = detected + cleaned + whitelisted + cancelled;

  if (total === 0) {
    return (
      <div className='stats-chart'>
        <svg width='160' height='160' viewBox='0 0 160 160'>
          <circle cx='80' cy='80' r='70' fill='none' stroke='#334155' strokeWidth='20' />
        </svg>
        <div className='stats-chart__center stats-chart__center--empty'>
          <span>{t('noData')}</span>
        </div>
      </div>
    );
  }

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const detectedLen = (detected / total) * circumference;
  const cleanedLen = (cleaned / total) * circumference;
  const cancelledLen = (cancelled / total) * circumference;
  const whitelistedLen = (whitelisted / total) * circumference;

  return (
    <div className='stats-chart'>
      <svg width='160' height='160' viewBox='0 0 160 160' style={{ transform: 'rotate(-90deg)' }}>
        <circle cx='80' cy='80' r={radius} fill='none' stroke='#1e293b' strokeWidth='20' />
        {detected > 0 && (
          <circle
            cx='80'
            cy='80'
            r={radius}
            fill='none'
            stroke='#f87171'
            strokeWidth='20'
            strokeDasharray={`${detectedLen} ${circumference}`}
            strokeDashoffset={0}
            className='chart-segment'
          />
        )}
        {cleaned > 0 && (
          <circle
            cx='80'
            cy='80'
            r={radius}
            fill='none'
            stroke='#34d399'
            strokeWidth='20'
            strokeDasharray={`${cleanedLen} ${circumference}`}
            strokeDashoffset={-detectedLen}
            className='chart-segment'
          />
        )}
        {cancelled > 0 && (
          <circle
            cx='80'
            cy='80'
            r={radius}
            fill='none'
            stroke='#fb923c'
            strokeWidth='20'
            strokeDasharray={`${cancelledLen} ${circumference}`}
            strokeDashoffset={-(detectedLen + cleanedLen)}
            className='chart-segment'
          />
        )}
        {whitelisted > 0 && (
          <circle
            cx='80'
            cy='80'
            r={radius}
            fill='none'
            stroke='#60a5fa'
            strokeWidth='20'
            strokeDasharray={`${whitelistedLen} ${circumference}`}
            strokeDashoffset={-(detectedLen + cleanedLen + cancelledLen)}
            className='chart-segment'
          />
        )}
      </svg>
      <div className='stats-chart__center'>
        <span className='stats-chart__total'>{total}</span>
        <span className='stats-chart__label'>{t('events')}</span>
      </div>
    </div>
  );
};
