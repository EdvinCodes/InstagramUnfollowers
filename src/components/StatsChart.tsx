import React from 'react';

interface StatsChartProps {
  detected: number; // Traitors (Rojo)
  cleaned: number; // Unfollowed (Verde)
  whitelisted: number; // Whitelisted (Azul)
}

export const StatsChart = ({ detected, cleaned, whitelisted }: StatsChartProps) => {
  const total = detected + cleaned + whitelisted;

  // Si no hay datos, mostramos un círculo gris
  if (total === 0) {
    return (
      <div
        style={{
          position: 'relative',
          width: '160px',
          height: '160px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width='160' height='160' viewBox='0 0 160 160'>
          <circle cx='80' cy='80' r='70' fill='none' stroke='#334155' strokeWidth='20' />
        </svg>
        <div style={{ position: 'absolute', textAlign: 'center', color: '#94a3b8' }}>
          <span style={{ fontSize: '0.8rem', display: 'block' }}>No Data</span>
        </div>
      </div>
    );
  }

  // Cálculos para el SVG (Circunferencia = 2 * PI * r)
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  // Calculamos los porcentajes para el stroke-dasharray
  const detectedPercent = (detected / total) * circumference;
  const cleanedPercent = (cleaned / total) * circumference;
  const whitelistedPercent = (whitelisted / total) * circumference;

  // Offsets (dónde empieza cada color)
  const offset1 = 0; // Empieza arriba
  const offset2 = -detectedPercent; // Empieza donde acaba el rojo
  const offset3 = -(detectedPercent + cleanedPercent); // Empieza donde acaba el verde

  return (
    <div
      style={{
        position: 'relative',
        width: '160px',
        height: '160px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width='160' height='160' viewBox='0 0 160 160' style={{ transform: 'rotate(-90deg)' }}>
        {/* Fondo (Gris oscuro) */}
        <circle cx='80' cy='80' r={radius} fill='none' stroke='#1e293b' strokeWidth='20' />

        {/* Segmento 1: Detectados (Rojo) */}
        {detected > 0 && (
          <circle
            cx='80'
            cy='80'
            r={radius}
            fill='none'
            stroke='#f87171'
            strokeWidth='20'
            strokeDasharray={`${detectedPercent} ${circumference}`}
            strokeDashoffset={offset1}
            className='chart-segment'
          />
        )}

        {/* Segmento 2: Limpiados (Verde) */}
        {cleaned > 0 && (
          <circle
            cx='80'
            cy='80'
            r={radius}
            fill='none'
            stroke='#34d399'
            strokeWidth='20'
            strokeDasharray={`${cleanedPercent} ${circumference}`}
            strokeDashoffset={offset2}
            className='chart-segment'
          />
        )}

        {/* Segmento 3: Whitelisted (Azul) */}
        {whitelisted > 0 && (
          <circle
            cx='80'
            cy='80'
            r={radius}
            fill='none'
            stroke='#60a5fa'
            strokeWidth='20'
            strokeDasharray={`${whitelistedPercent} ${circumference}`}
            strokeDashoffset={offset3}
            className='chart-segment'
          />
        )}
      </svg>

      {/* Texto Central */}
      <div style={{ position: 'absolute', textAlign: 'center', color: 'white' }}>
        <span style={{ fontSize: '2rem', fontWeight: 'bold', display: 'block', lineHeight: 1 }}>
          {total}
        </span>
        <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>
          Events
        </span>
      </div>
    </div>
  );
};
