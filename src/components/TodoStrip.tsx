import React from 'react';
import {Box, Text} from 'ink';
import type {TaskPhase} from '../orchestration/contracts.js';
import {mcpStatusSymbol, type MCPServerStatus} from '../mcp/MCPManager.js';

export type TodoStatus = 'pending' | 'running' | 'pass' | 'fail' | 'cancelled';

export interface TodoItem {
  id: string;
  label: string;
  status: TodoStatus;
  agentLabel?: string;
  attempt?: number;
  detail?: string;
}

export function TodoStrip({tasks, mcpServers = []}: {tasks: readonly TodoItem[]; mcpServers?: readonly MCPServerStatus[]}): React.JSX.Element {
  const completed = tasks.filter((task) => task.status === 'pass').length;
  const total = tasks.length;
  const progressBar = renderProgressBar(completed, total);
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" paddingX={1} flexGrow={1} minHeight={0} overflow="hidden">
      <Box justifyContent="space-between" marginBottom={1}>
        <Box gap={1}>
          <Text bold color="magenta">◆</Text>
          <Text bold color="magenta">PIPELINE</Text>
        </Box>
        <Text color="gray">{completed}/{total}</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="magenta">{progressBar}</Text>
      </Box>
      <Box flexDirection="column">
        {tasks.length === 0 && <Text dimColor>○ Chưa có pipeline</Text>}
        {tasks.map((task) => (
          <Box key={task.id} flexDirection="column" marginBottom={task.status === 'running' ? 1 : 0}>
            <Box gap={1}>
              <Text color={todoColor(task.status)} bold={task.status === 'running'} strikethrough={task.status === 'pass'}>
                {todoSymbol(task.status)}
              </Text>
              <Text color={todoColor(task.status)} bold={task.status === 'running'} strikethrough={task.status === 'pass'}>
                {task.label}
              </Text>
            </Box>
            {task.status !== 'pass' && task.agentLabel !== undefined && (
              <Box paddingLeft={2}>
                <Text dimColor>↳ {task.agentLabel}{task.attempt === undefined ? '' : ` · #${task.attempt}`}</Text>
              </Box>
            )}
            {task.status === 'running' && task.detail !== undefined && (
              <Box paddingLeft={2}>
                <Text color="yellow">⸻ {compactTodoDetail(task.detail)}</Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Box gap={1} marginBottom={tasks.length > 0 ? 1 : 0}>
          <Text bold color="magenta">◆</Text>
          <Text bold color="magenta">MCP</Text>
        </Box>
        {mcpServers.length === 0 && <Text dimColor>○ Chưa cấu hình</Text>}
        {mcpServers.map((server) => (
          <Text key={server.name} color={server.state === 'connected' ? 'green' : server.state === 'error' ? 'red' : 'gray'}>
            {mcpStatusSymbol(server.state)} {server.name}{server.toolCount === undefined ? '' : ` · ${server.toolCount} tools`}
          </Text>
        ))}
      </Box>
    </Box>
  );
}

function renderProgressBar(completed: number, total: number): string {
  if (total === 0) return '░░░░░░░░░░';
  const width = 10;
  const filled = Math.round((completed / total) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

export function phaseTodoLabel(phase: TaskPhase, workflow: string): string {
  if (phase === 'analyze') return 'Phân tích yêu cầu';
  if (phase === 'meeting') return 'Làm rõ yêu cầu';
  if (phase === 'architect') return 'Thiết kế kiến trúc';
  if (phase === 'ui-ux') return 'Thiết kế UI/UX';
  if (phase === 'code') {
    if (workflow === 'game') return 'Xây dựng gameplay';
    if (workflow === 'web') return 'Triển khai giao diện';
    return 'Triển khai tính năng';
  }
  if (phase === 'test') return 'Chạy kiểm thử';
  if (phase === 'fix') return 'Sửa lỗi phát hiện';
  if (phase === 'review') return 'Review chất lượng';
  if (phase === 'build') return workflow === 'game' ? 'Build & kiểm tra game' : 'Build & kiểm tra app';
  return 'Lưu trạng thái';
}

export function compactTodoDetail(value: string, maxLength = 72): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length <= maxLength ? compact : `${compact.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

export function todoSymbol(status: TodoStatus): string {
  if (status === 'pass') return '✓';
  if (status === 'running') return '●';
  if (status === 'fail') return '✖';
  if (status === 'cancelled') return '■';
  return '○';
}

function todoColor(status: TodoStatus): 'gray' | 'yellow' | 'green' | 'red' {
  if (status === 'pass') return 'green';
  if (status === 'running') return 'yellow';
  if (status === 'fail') return 'red';
  return 'gray';
}
