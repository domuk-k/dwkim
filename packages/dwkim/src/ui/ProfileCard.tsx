import React from 'react';
import { Box, Text } from 'ink';
import { theme } from './theme.js';
import { profile, icons } from './data.js';

// 간소화된 한 줄 프로필 (채팅 모드용)
export function ProfileBanner() {
  return (
    <Box paddingX={1} paddingY={0}>
      <Text bold color={theme.lavender}>
        {profile.name}
      </Text>
      <Text color={theme.muted}> • </Text>
      <Text color={theme.subtext}>{profile.title}</Text>
      <Text color={theme.muted}> • </Text>
      <Text color={theme.primary}>{icons.github} domuk-k</Text>
    </Box>
  );
}

// 상세 프로필 카드 (profile 명령어용)
export function ProfileCard() {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.primary}
      paddingX={2}
      paddingY={1}
    >
      <Box>
        <Text bold color={theme.lavender}>
          {profile.name}
        </Text>
        <Text color={theme.subtext}> {profile.title}</Text>
      </Box>

      <Box marginTop={1}>
        <Text color={theme.text}>{profile.bio}</Text>
      </Box>

      <Box marginY={1}>
        <Text color={theme.surface}>{'─'.repeat(52)}</Text>
      </Box>

      <Box flexDirection="column" gap={0}>
        <LinkRow icon={icons.email} label="Email" value={profile.email} />
        <LinkRow icon={icons.github} label="GitHub" value={profile.github} />
        <LinkRow icon={icons.web} label="Website" value={profile.website} />
        <LinkRow icon={icons.project} label="Project" value={profile.project} />
      </Box>

      <Box marginY={1}>
        <Text color={theme.surface}>{'─'.repeat(52)}</Text>
      </Box>

      <Text italic color={theme.muted}>
        "{profile.quote}"
      </Text>
    </Box>
  );
}

function LinkRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <Box>
      <Text color={theme.primary}>
        {icon} {label.padEnd(8)}
      </Text>
      <Text color={theme.text}>{value}</Text>
    </Box>
  );
}
