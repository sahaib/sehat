'use client';

import { Message, Language } from '@/types';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import ReadAloudButton from './ReadAloudButton';

interface ConversationThreadProps {
  messages: Message[];
  language: Language;
}

/** Lightweight markdown-to-JSX: handles **bold**, *italic*, bullet/numbered lists, ### headings */
function renderMarkdown(text: string) {
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

  const inlineFormat = (str: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    // Match **bold**, *italic*, and plain text
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
  return elements;
}

export default function ConversationThread({
  messages,
  language,
}: ConversationThreadProps) {
  if (messages.length === 0) return null;

  const speechCode = SUPPORTED_LANGUAGES.find((l) => l.code === language)?.speechCode || 'en-IN';

  return (
    <div className="flex flex-col gap-3 w-full" role="log" aria-label="Conversation">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {msg.role === 'user' ? (
            <div className="chat-bubble chat-bubble-user">
              <p className="whitespace-pre-wrap text-base leading-relaxed">
                {msg.content}
              </p>
            </div>
          ) : (
            <div className="chat-bubble chat-bubble-assistant">
              {msg.isFollowUp && (
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Follow-up question</span>
                </div>
              )}
              <div className="text-base leading-relaxed">
                {renderMarkdown(msg.content)}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100">
                <ReadAloudButton text={msg.content} languageCode={speechCode} size="sm" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
