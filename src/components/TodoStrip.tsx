import React from 'react';
import {Box, Text} from 'ink';

export type TodoStatus = 'pending' | 'running' | 'pass' | 'fail' | 'cancelled';

export interface TodoItem {
  id: string;
  label: string;
  status: TodoStatus;
}

export function TodoStrip({tasks}: {tasks: readonly TodoItem[]}): React.JSX.Element {
  const completed = tasks.filter((task) => task.status === 'pass').length;
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} flexGrow={1} minHeight={0} overflow="hidden">
      <Box justifyContent="space-between">
        <Text bold color="cyan">TASKS</Text>
        <Text color="gray">{completed}/{tasks.length} hoàn tất</Text>
      </Box>
      <Box flexDirection="column">
        {tasks.length === 0 && <Text dimColor>○ Chưa có pipeline</Text>}
        {tasks.map((task) => (
          <Box key={task.id}>
            <Text color={todoColor(task.status)} bold={task.status === 'running'} strikethrough={task.status === 'pass'}>
              {todoSymbol(task.status)} {task.label}
            </Text>
          </Box>
        ))}
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text bold color="cyan">MCP</Text>
        <Text dimColor>○ Chưa cấu hình</Text>
      </Box>
    </Box>
  );
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
