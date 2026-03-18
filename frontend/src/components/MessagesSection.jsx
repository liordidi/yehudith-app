import React from 'react';

export function MessagesSection({ messages }) {
  if (!messages?.items?.length) return null;

  return (
    <section className="messages-section" dir="rtl">
      <h2>{messages.title}</h2>
      <div className="messages-grid">
        {messages.items.map((msg, i) => (
          <div className="message-card" key={msg.id ?? i}>
            <p className="message-text">״{msg.text}״</p>
            {msg.author && <div className="message-author">— {msg.author}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
