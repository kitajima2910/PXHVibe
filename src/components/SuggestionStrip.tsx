import React, {useRef} from 'react';
import {Box, Text, useInput, measureElement, type DOMElement} from 'ink';
import {parseTerminalMouse} from '../utils/mouse.js';

export interface Suggestion {
  id: number;
  text: string;
  category: 'improvement' | 'idea' | 'upgrade';
}

interface SuggestionStripProps {
  suggestions: readonly Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
}

export function SuggestionStrip({suggestions, onSelect}: SuggestionStripProps): React.JSX.Element {
  const itemRefs = useRef<(DOMElement | null)[]>([]);

  useInput((input, key) => {
    // Handle keyboard input (1, 2, 3)
    if (input === '1' && suggestions[0]) {
      onSelect(suggestions[0]);
      return;
    }
    if (input === '2' && suggestions[1]) {
      onSelect(suggestions[1]);
      return;
    }
    if (input === '3' && suggestions[2]) {
      onSelect(suggestions[2]);
      return;
    }

    // Handle mouse click
    const mouse = parseTerminalMouse(input);
    if (mouse !== undefined && mouse.button === 'left' && mouse.action === 'press') {
      // Check which suggestion item was clicked
      for (let i = 0; i < itemRefs.current.length; i++) {
        const ref = itemRefs.current[i];
        if (ref !== null && ref !== undefined) {
          const metrics = measureElement(ref);
          if (
            mouse.x >= metrics.x &&
            mouse.x < metrics.x + metrics.width &&
            mouse.y >= metrics.y &&
            mouse.y < metrics.y + metrics.height
          ) {
            const suggestion = suggestions[i];
            if (suggestion) {
              onSelect(suggestion);
              return;
            }
          }
        }
      }
    }
  });

  if (suggestions.length === 0) {
    return <></>;
  }

  const categoryIcon = (category: Suggestion['category']): string => {
    switch (category) {
      case 'improvement': return '🔧';
      case 'idea': return '💭';
      case 'upgrade': return '⚡';
    }
  };

  return (
    <Box flexDirection="column" marginTop={1} marginBottom={1}>
      <Box flexDirection="column" marginTop={1}>
        {suggestions.map((suggestion, index) => (
          <Box
            key={suggestion.id}
            ref={(el) => {
              if (el) {
                itemRefs.current[index] = el;
              }
            }}
            paddingLeft={2}
          >
            <Text color="cyan" bold>
              {index + 1}. {categoryIcon(suggestion.category)} {suggestion.text}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
