import React from 'react';
import { Box } from 'ink';
import { ProfileCard, ProfileBanner } from './ProfileCard.js';
import { ChatView } from './ChatView.js';

const DEFAULT_API_URL = 'https://persona-api.fly.dev';
const API_URL = process.env.DWKIM_API_URL || DEFAULT_API_URL;

export type Mode = 'full' | 'profile';

interface Props {
  mode: Mode;
}

export function App({ mode }: Props) {
  if (mode === 'profile') {
    return <ProfileCard />;
  }

  // 채팅 모드: 배너 + 채팅
  return (
    <Box flexDirection="column">
      <ProfileBanner />
      <ChatView apiUrl={API_URL} />
    </Box>
  );
}
