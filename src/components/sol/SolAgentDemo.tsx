'use client';

import React, { useState, useEffect } from 'react';
import { RoomAudioRenderer, LiveKitRoom, useVoiceAssistant, useAgentExpression } from '@livekit/components-react';
import { AgentAudioVisualizerRadial } from '@/components/agents-ui/agent-audio-visualizer-radial';

export const MOOD_COLORS: Record<string, string> = {
  empathetic: '#36CFC9', // Soft cyan/teal for clinical care and reassuring empathy
  calm: '#F2A93B',       // Sol's signature warm amber
  happy: '#FFC53D',      // Joyful gold for confirmed booking
  hopeful: '#52C41A',    // Reassuring green
  curious: '#9254DE',    // Inquisitive purple for intake questions
  surprised: '#B37FEB',  // Soft lavender
  anxious: '#D46B08',    // Amber-orange
  sad: '#2F54EB',        // Gentle deep blue
  excited: '#FF7A45',    // Energetic coral
};

export function Demo() {
  const { audioTrack, state } = useVoiceAssistant();
  const { mood } = useAgentExpression();
  const visualizerColor = (mood && MOOD_COLORS[mood]) ? MOOD_COLORS[mood] : '#F2A93B';

  return (
    <div className="flex flex-col items-center gap-2">
      <AgentAudioVisualizerRadial
        size="lg"
        color={visualizerColor}
        radius={undefined}
        state={state}
        audioTrack={audioTrack}
      />
      {mood && (
        <span
          className="text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize transition-colors duration-300"
          style={{
            color: visualizerColor,
            backgroundColor: `${visualizerColor}15`,
            border: `1px solid ${visualizerColor}40`,
          }}
        >
          {mood}
        </span>
      )}
    </div>
  );
}

function LiveSession({ onEnd }: { onEnd: () => void }) {
  const [tokenData, setTokenData] = useState<{ serverUrl: string; token: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/token', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (data.participant_token && data.server_url) {
          setTokenData({ serverUrl: data.server_url, token: data.participant_token });
        } else {
          setError('connection');
        }
      })
      .catch(() => setError('connection'));
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 p-4 bg-[#1e1a17] text-[#FBF6EE] rounded-xl border border-[#F2A93B]/30 max-w-sm mx-auto text-center shadow-2xl">
        <p className="text-sm font-semibold">Could not connect to Sol Reception. Please check your connection.</p>
        <button
          onClick={onEnd}
          className="px-4 py-2 bg-[#F2A93B] text-[#171311] font-semibold text-xs rounded-lg hover:bg-[#ffc069] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!tokenData) {
    return (
      <div className="flex flex-col items-center gap-4">
        <AgentAudioVisualizerRadial size="lg" color="#F2A93B" state="connecting" />
        <p className="text-sm font-semibold text-[#F2A93B]">Connecting to Sol...</p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={tokenData.serverUrl}
      token={tokenData.token}
      connect={true}
      audio={true}
      video={false}
      options={{
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      }}
      onDisconnected={onEnd}
    >
      <div className="flex flex-col items-center gap-4">
        <Demo />
        <RoomAudioRenderer />
        <button
          onClick={onEnd}
          className="inline-flex items-center gap-2 bg-[#F2A93B]/10 text-[#F2A93B] border border-[#F2A93B]/40 hover:bg-[#F2A93B]/20 font-semibold px-5 py-2.5 rounded-full transition-colors text-sm shadow-md"
        >
          <span aria-hidden="true">✕</span>
          End Call
        </button>
      </div>
    </LiveKitRoom>
  );
}

export default function DemoWrapper() {
  const [active, setActive] = useState(false);

  return (
    <div className="sol-agent-container flex flex-col items-center justify-center p-4">
      {active ? (
        <LiveSession onEnd={() => setActive(false)} />
      ) : (
        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => setActive(true)}
            title="Click to talk to Sol"
          >
            <AgentAudioVisualizerRadial
              size="lg"
              color="#F2A93B"
              state="listening"
            />
          </div>
          <button
            onClick={() => setActive(true)}
            className="inline-flex items-center gap-2 bg-[#F2A93B] text-[#171311] font-semibold text-base px-6 py-3 rounded-full hover:bg-[#ffc069] transition-all shadow-lg shadow-[#F2A93B]/20 hover:shadow-[#F2A93B]/40 transform hover:-translate-y-0.5"
          >
            <span aria-hidden="true">🎙️</span>
            Talk to Sol Reception
          </button>
        </div>
      )}
    </div>
  );
}

