import React from 'react';
import {
  SessionProvider,
  RoomContext,
  type UseSessionReturn,
  RoomAudioRenderer,
  type SessionProviderProps,
  type RoomAudioRendererProps,
} from '@livekit/components-react';
import { Room } from 'livekit-client';

export type AgentSessionProviderProps = SessionProviderProps &
  RoomAudioRendererProps & {
    room?: Room;
    volume?: number;
    muted?: boolean;
    session: UseSessionReturn;
    children: React.ReactNode;
  };

export function AgentSessionProvider({
  session,
  children,
  ...roomAudioRendererProps
}: AgentSessionProviderProps) {
  return (
    <SessionProvider session={session}>
      <RoomContext.Provider value={session.room}>
        {children}
        <RoomAudioRenderer {...roomAudioRendererProps} />
      </RoomContext.Provider>
    </SessionProvider>
  );
}

