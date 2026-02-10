'use client';

import { Message } from '@/types';

interface ConversationThreadProps {
  messages: Message[];
}

export default function ConversationThread({
  messages,
}: ConversationThreadProps) {
  if (messages.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 w-full" role="log" aria-label="Conversation">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`chat-bubble ${
              msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'
            }`}
          >
            <p className="whitespace-pre-wrap text-base leading-relaxed">
              {msg.content}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
