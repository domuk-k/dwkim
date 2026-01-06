import React from 'react';
import { Box, Text } from 'ink';
import { theme } from './theme.js';

/**
 * HITL: Response Feedback Prompt (UI Only)
 *
 * Claude Code 스타일 피드백 UI:
 * - 1-3 scale + dismiss
 * - 키보드 입력은 부모 컴포넌트에서 처리
 *
 * Privacy: 숫자 rating만 수집 (대화 내용, 코드 포함 안함)
 */
export function FeedbackPrompt() {
  return (
    <Box flexDirection="column" marginTop={1} marginLeft={2}>
      <Text color={theme.subtext}>How was this response?</Text>
      <Text>
        <Text color={theme.success}>[1]</Text>
        <Text color={theme.subtext}> Good  </Text>
        <Text color={theme.warning}>[2]</Text>
        <Text color={theme.subtext}> Okay  </Text>
        <Text color={theme.error}>[3]</Text>
        <Text color={theme.subtext}> Poor  </Text>
        <Text color={theme.muted}>[d]</Text>
        <Text color={theme.subtext}> Dismiss</Text>
      </Text>
    </Box>
  );
}
