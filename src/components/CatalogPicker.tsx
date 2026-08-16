import React, {useMemo, useState} from 'react';
import {Box, Text, useInput} from 'ink';
import {FormattedBlocks, FormattedText} from './FormattedText.js';
import {parseTerminalBlocks, type TerminalBlock} from '../utils/terminalFormat.js';

export interface CatalogPickerItem {
  id: string;
  label: string;
  description: string;
  meta?: string;
  markdown?: string;
}

interface CatalogPickerProps {
  title: string;
  items: readonly CatalogPickerItem[];
  onClose: () => void;
  pageSize?: number;
}

export function CatalogPicker({title, items, onClose, pageSize = 8}: CatalogPickerProps): React.JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailOffset, setDetailOffset] = useState(0);
  const safePageSize = Math.max(1, pageSize);
  const maxStart = Math.max(0, items.length - safePageSize);
  const windowStart = Math.min(maxStart, Math.max(0, selectedIndex - Math.floor(safePageSize / 2)));
  const visibleItems = items.slice(windowStart, windowStart + safePageSize);
  const selectedItem = items[selectedIndex];
  const detailSource = selectedItem?.markdown ?? selectedItem?.description ?? '';
  const detailBlocks = useMemo(
    () => expandCodeBlocks(parseTerminalBlocks(detailSource)),
    [detailSource],
  );
  const detailPageSize = 8;
  const detailMaxOffset = Math.max(0, detailBlocks.length - detailPageSize);
  const visibleDetailBlocks = detailBlocks.slice(detailOffset, detailOffset + detailPageSize);

  useInput((input, key) => {
    if (key.ctrl && input.toLowerCase() === 'c') return onClose();
    if (isDetailOpen) {
      if (key.escape || key.return) {
        setIsDetailOpen(false);
        setDetailOffset(0);
        return;
      }
      if (key.upArrow) return setDetailOffset((current) => Math.max(0, current - 1));
      if (key.downArrow) return setDetailOffset((current) => Math.min(detailMaxOffset, current + 1));
      if (key.pageUp) return setDetailOffset((current) => Math.max(0, current - detailPageSize));
      if (key.pageDown) return setDetailOffset((current) => Math.min(detailMaxOffset, current + detailPageSize));
      return;
    }
    if (key.escape) return onClose();
    if (key.return && selectedItem !== undefined) {
      setIsDetailOpen(true);
      setDetailOffset(0);
      return;
    }
    if (items.length === 0) return;
    if (key.upArrow) return moveSelection((current) => (current - 1 + items.length) % items.length);
    if (key.downArrow) return moveSelection((current) => (current + 1) % items.length);
    if (key.pageUp) return moveSelection((current) => Math.max(0, current - safePageSize));
    if (key.pageDown) return moveSelection((current) => Math.min(items.length - 1, current + safePageSize));
  });

  const moveSelection = (update: (current: number) => number): void => {
    setSelectedIndex(update);
    setDetailOffset(0);
  };

  if (isDetailOpen && selectedItem !== undefined) {
    const detailEnd = Math.min(detailBlocks.length, detailOffset + visibleDetailBlocks.length);
    return (
      <Box flexDirection="column" borderStyle="single" borderColor="magenta" paddingX={1}>
        <Box justifyContent="space-between">
          <Text bold color="magenta">{title} · {selectedItem.label}</Text>
          <Text dimColor>{detailBlocks.length === 0 ? '0/0' : `${detailOffset + 1}–${detailEnd}/${detailBlocks.length}`}</Text>
        </Box>
        <Box flexDirection="column" marginTop={1}>
          <FormattedBlocks blocks={visibleDetailBlocks} />
        </Box>
        <Box marginTop={1}>
          <Text dimColor><Text color="magenta">↑↓/PgUp/PgDn</Text> cuộn  ·  <Text color="magenta">Enter/Esc</Text> quay lại</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="magenta" paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold color="magenta">{title}</Text>
        <Text dimColor>{items.length === 0 ? '0/0' : `${selectedIndex + 1}/${items.length}`}</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {windowStart > 0 ? <Text dimColor>  ↑ {windowStart} mục phía trên</Text> : null}
        {visibleItems.map((item, offset) => {
          const index = windowStart + offset;
          return (
            <Text key={item.id} bold={index === selectedIndex} color={index === selectedIndex ? 'magenta' : 'gray'}>
              {index === selectedIndex ? '● ' : '  '}{item.label}
            </Text>
          );
        })}
        {windowStart + visibleItems.length < items.length ? (
          <Text dimColor>  ↓ {items.length - windowStart - visibleItems.length} mục phía dưới</Text>
        ) : null}
      </Box>
      {selectedItem === undefined ? null : (
        <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text bold color="magenta">{selectedItem.label}</Text>
          <FormattedText content={compactCatalogText(selectedItem.description)} />
          {selectedItem.meta === undefined ? null : <Text dimColor>{compactCatalogText(selectedItem.meta, 120)}</Text>}
        </Box>
      )}
      <Box marginTop={1}>
        <Text dimColor><Text color="magenta">↑↓/PgUp/PgDn</Text> chọn  ·  <Text color="magenta">Enter</Text> xem Markdown  ·  <Text color="magenta">Esc</Text> đóng</Text>
      </Box>
    </Box>
  );
}

export function expandCodeBlocks(blocks: readonly TerminalBlock[], maxCodeLines = 8): TerminalBlock[] {
  const safeMaxCodeLines = Math.max(1, maxCodeLines);
  return blocks.flatMap((block) => {
    if (block.type !== 'code') return [block];
    const lines = block.content.split('\n');
    const chunks: TerminalBlock[] = [];
    for (let index = 0; index < lines.length; index += safeMaxCodeLines) {
      chunks.push({type: 'code', content: lines.slice(index, index + safeMaxCodeLines).join('\n'), language: block.language});
    }
    return chunks.length === 0 ? [{...block, content: ''}] : chunks;
  });
}

export function compactCatalogText(value: string, maxLength = 160): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length <= maxLength ? compact : `${compact.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}
