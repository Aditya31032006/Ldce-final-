import React from 'react';

/**
 * RouteLoader
 * Aesthetic loading fallback for React.Suspense page transitions.
 * Styled to seamlessly harmonize with the Court & Ledger design system.
 */
export default function RouteLoader({ message = 'Loading view...', fullScreen = false }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: fullScreen ? '100vh' : '65vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1.25rem',
        padding: '2rem',
        boxSizing: 'border-box',
        background: 'transparent',
      }}
    >
      {/* Dual Ring Animated Spinner */}
      <div
        style={{
          position: 'relative',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Outer Pulsing Glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, rgba(37, 99, 235, 0) 70%)',
            animation: 'df-pulse 2s ease-in-out infinite',
          }}
        />

        {/* Outer Ring */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid rgba(226, 232, 240, 0.8)',
          }}
        />

        {/* Inner Spinning Arc */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: '#2563eb',
            borderRightColor: '#3b82f6',
            animation: 'df-spin 0.75s linear infinite',
          }}
        />

        {/* Center Accent Dot */}
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#2563eb',
            boxShadow: '0 0 8px rgba(37, 99, 235, 0.6)',
          }}
        />
      </div>

      {/* Loading Label */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.25rem',
        }}
      >
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#334155',
            letterSpacing: '0.01em',
            fontFamily: 'Inter, -apple-system, sans-serif',
          }}
        >
          {message}
        </span>
        <span
          style={{
            fontSize: '0.75rem',
            color: '#94a3b8',
            fontWeight: 500,
          }}
        >
          Please wait a moment
        </span>
      </div>

      <style>{`
        @keyframes df-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.35); opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}
