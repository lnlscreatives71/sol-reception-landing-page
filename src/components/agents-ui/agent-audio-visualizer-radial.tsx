'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { type LocalAudioTrack, type RemoteAudioTrack } from 'livekit-client';
import {
  type AgentState,
  type TrackReferenceOrPlaceholder,
  useMultibandTrackVolume,
} from '@livekit/components-react';

const SOL_SUN_AMBER = '#F2A93B';

export interface AgentAudioVisualizerRadialProps {
  /**
   * Size of the visualizer.
   * @default 'lg'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Primary ray & sun core color in hex/RGB string.
   * Defaults to Sol sun logo amber (#F2A93B).
   */
  color?: string;
  /**
   * Custom core radius in pixels.
   */
  radius?: number;
  /**
   * Current agent state.
   */
  state?: AgentState;
  /**
   * Audio track to visualize.
   */
  audioTrack?: LocalAudioTrack | RemoteAudioTrack | TrackReferenceOrPlaceholder;
  /**
   * Number of radial sun burst rays.
   * @default 24
   */
  rayCount?: number;
  className?: string;
  style?: React.CSSProperties;
}

const SIZE_MAP = {
  sm: { width: 120, height: 120, coreRadius: 18, maxRayLen: 20 },
  md: { width: 200, height: 200, coreRadius: 30, maxRayLen: 36 },
  lg: { width: 280, height: 280, coreRadius: 45, maxRayLen: 55 },
  xl: { width: 380, height: 380, coreRadius: 60, maxRayLen: 80 },
};

export function AgentAudioVisualizerRadial({
  size = 'lg',
  color = SOL_SUN_AMBER,
  radius,
  state = 'listening',
  audioTrack,
  rayCount = 24,
  className = '',
  style,
}: AgentAudioVisualizerRadialProps) {
  const dimensions = SIZE_MAP[size] || SIZE_MAP.lg;
  const coreRadius = radius ?? dimensions.coreRadius;
  const { width, height, maxRayLen } = dimensions;
  const center = width / 2;

  // Track audio volume across bands for radial rays
  const rawVolumeBands = useMultibandTrackVolume(audioTrack, {
    bands: rayCount,
    loPass: 100,
    hiPass: 400,
  });

  // Ambient animation tick for thinking / idle / connecting states
  const [pulseTick, setPulseTick] = useState(0);

  useEffect(() => {
    let animId: number;
    let startTime = performance.now();

    const loop = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      setPulseTick(elapsed);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const rays = useMemo(() => {
    const isSpeaking = state === 'speaking';
    const isThinking = state === 'thinking';
    const isListening = state === 'listening';
    const isConnecting = state === 'connecting' || state === 'initializing';

    return Array.from({ length: rayCount }).map((_, i) => {
      const angleDeg = (i * 360) / rayCount;
      const angleRad = (angleDeg * Math.PI) / 180;

      let bandVol = 0;
      if (isSpeaking && rawVolumeBands.length > 0) {
        bandVol = rawVolumeBands[i % rawVolumeBands.length] || 0;
      }

      // Base ray length + dynamic height
      let rayHeight = 0;
      if (isSpeaking) {
        rayHeight = 4 + bandVol * maxRayLen * 1.2;
      } else if (isThinking) {
        // Rotating wave during thinking
        const wave = Math.sin(pulseTick * 5 + i * 0.4);
        rayHeight = 8 + (wave + 1) * (maxRayLen * 0.25);
      } else if (isListening) {
        // Soft breathe while listening
        const wave = Math.sin(pulseTick * 2 + i * 0.2);
        rayHeight = 6 + (wave + 1) * 4;
      } else if (isConnecting) {
        // Pulse ring while connecting
        const wave = Math.sin(pulseTick * 3);
        rayHeight = 5 + (wave + 1) * 3;
      } else {
        rayHeight = 4;
      }

      const innerDist = coreRadius + 6;
      const outerDist = innerDist + Math.max(3, rayHeight);

      const x1 = center + innerDist * Math.cos(angleRad);
      const y1 = center + innerDist * Math.sin(angleRad);
      const x2 = center + outerDist * Math.cos(angleRad);
      const y2 = center + outerDist * Math.sin(angleRad);

      const opacity = isSpeaking
        ? Math.min(1, 0.4 + bandVol * 0.8)
        : isThinking
        ? 0.6 + Math.sin(pulseTick * 4 + i) * 0.3
        : 0.75;

      return { x1, y1, x2, y2, opacity };
    });
  }, [rayCount, rawVolumeBands, state, pulseTick, coreRadius, maxRayLen, center]);

  // Center core pulse scaling
  const coreScale = useMemo(() => {
    if (state === 'speaking' && rawVolumeBands.length > 0) {
      const avgVol = rawVolumeBands.reduce((a, b) => a + b, 0) / rawVolumeBands.length;
      return 1 + avgVol * 0.25;
    }
    if (state === 'thinking') {
      return 1 + Math.sin(pulseTick * 4) * 0.08;
    }
    if (state === 'listening') {
      return 1 + Math.sin(pulseTick * 1.8) * 0.04;
    }
    return 1;
  }, [state, rawVolumeBands, pulseTick]);

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width, height, ...style }}
      data-lk-state={state}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Radial Glow Filter */}
          <filter id="sol-sun-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Sol Sun Core Gradient */}
          <radialGradient id="sol-core-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF2D6" />
            <stop offset="60%" stopColor={color} />
            <stop offset="100%" stopColor="#D98A1B" />
          </radialGradient>
        </defs>

        {/* Ambient Outer Halo */}
        <circle
          cx={center}
          cy={center}
          r={coreRadius * 1.6 * coreScale}
          fill={color}
          opacity={state === 'speaking' ? 0.25 : 0.12}
          filter="url(#sol-sun-glow)"
          style={{ transition: 'r 100ms ease-out, opacity 200ms ease' }}
        />

        {/* Radiating Sun Burst Rays */}
        <g filter="url(#sol-sun-glow)">
          {rays.map((ray, idx) => (
            <line
              key={idx}
              x1={ray.x1}
              y1={ray.y1}
              x2={ray.x2}
              y2={ray.y2}
              stroke={color}
              strokeWidth={Math.max(3, (coreRadius / 15))}
              strokeLinecap="round"
              opacity={ray.opacity}
              style={{ transition: 'all 60ms linear' }}
            />
          ))}
        </g>

        {/* Central Sun Disc */}
        <circle
          cx={center}
          cy={center}
          r={coreRadius * coreScale}
          fill="url(#sol-core-gradient)"
          stroke={color}
          strokeWidth="2"
          style={{ transition: 'r 80ms ease-out' }}
        />

        {/* Inner Sun Center Highlight */}
        <circle
          cx={center}
          cy={center}
          r={coreRadius * 0.35 * coreScale}
          fill="#FFF9EE"
          opacity="0.85"
        />
      </svg>
    </div>
  );
}
