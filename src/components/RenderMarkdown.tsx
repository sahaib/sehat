'use client';

import React from 'react';

interface RenderMarkdownProps {
  text: string;
  className?: string;
}

/** Apply inline bold/italic formatting to a string. Exported for use in structured fields. */
export function inlineFormat(str: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;
  let i = 0;
  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(str.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={`b${i}`} className="font-semibold text-gray-900">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={`i${i}`}>{match[3]}</em>);
    }
    lastIndex = match.index + match[0].length;
    i++;
  }
  if (lastIndex < str.length) {
    parts.push(str.slice(lastIndex));
  }
  return parts;
}

/** Strip markdown symbols from text (for TTS / plain-text contexts). */
export function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,3}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .trim();
}

/** Lightweight markdown-to-JSX: handles **bold**, *italic*, bullet/numbered lists, ### headings */
export default function RenderMarkdown({ text, className }: RenderMarkdownProps) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const Tag = listType;
      elements.push(
        <Tag key={key++} className={listType === 'ul' ? 'list-disc pl-5 my-1.5 space-y-0.5' : 'list-decimal pl-5 my-1.5 space-y-0.5'}>
          {listItems}
        </Tag>
      );
      listItems = [];
      listType = null;
    }
  };

  for (const line of lines) {
    // Heading: ### text
    const headingMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      flushList();
      elements.push(
        <p key={key++} className="font-semibold text-gray-900 mt-3 mb-1">
          {inlineFormat(headingMatch[1])}
        </p>
      );
      continue;
    }

    // Bullet list: - item or * item
    const bulletMatch = line.match(/^\s*[-*]\s+(.+)/);
    if (bulletMatch) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(<li key={key++}>{inlineFormat(bulletMatch[1])}</li>);
      continue;
    }

    // Numbered list: 1. item
    const numMatch = line.match(/^\s*\d+\.\s+(.+)/);
    if (numMatch) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(<li key={key++}>{inlineFormat(numMatch[1])}</li>);
      continue;
    }

    flushList();

    // Empty line = paragraph break
    if (line.trim() === '') {
      elements.push(<br key={key++} />);
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key++} className="my-1">
        {inlineFormat(line)}
      </p>
    );
  }

  flushList();

  return <div className={className}>{elements}</div>;
}
