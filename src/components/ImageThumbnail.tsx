import React from 'react';
import {Box, Text} from 'ink';
import type {ImageAttachment} from '../types/attachment.js';

export function ImageThumbnail({image}: {image: ImageAttachment}): React.JSX.Element {
  const rows: React.JSX.Element[] = [];
  for (let y = 0; y < image.thumbnail.length; y += 2) {
    const upper = image.thumbnail[y] ?? [];
    const lower = image.thumbnail[y + 1] ?? upper;
    rows.push(
      <Text key={y}>
        {upper.map((color, x) => (
          <Text key={x} color={color} backgroundColor={lower[x] ?? color}>▀</Text>
        ))}
      </Text>,
    );
  }

  return (
    <Box flexDirection="column" marginRight={2}>
      {rows}
      <Text dimColor>{image.width}×{image.height} · {formatBytes(image.size)}</Text>
    </Box>
  );
}

function formatBytes(size: number): string {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
