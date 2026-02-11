'use client';

import { Message, Language } from '@/types';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import ReadAloudButton from './ReadAloudButton';

interface ConversationThreadProps {
  messages: Message[];
  language: Language;
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
              <p className="whitespace-pre-wrap text-base leading-relaxed">
                {msg.content}
              </p>
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
