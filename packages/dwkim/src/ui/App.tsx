import React from 'react';
import { Box, Static } from 'ink';
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

  // 채팅 모드: 간소화된 배너 + 채팅
  return (
    <Box flexDirection="column">
      {/* 상단 고정 배너 (한 번만 렌더링) */}
      <Static items={['banner']}>
        {() => <ProfileBanner key="banner" />}
      </Static>

      <ChatView apiUrl={API_URL} />
    </Box>
  );
}
