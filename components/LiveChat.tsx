"use client";

import { useState } from "react";

export function LiveChat() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="live-chat"
        onClick={() => setOpen(!open)}
        aria-label="Open live chat"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        <span className="live-chat__pulse" />
      </button>

      {open && (
        <div className="chat-widget" id="chatWidget">
          <div className="chat-widget__header">
            <div>
              <strong>LinuxPro Support</strong>
              <span className="chat-widget__status">Online — Typically replies in 2 min</span>
            </div>
            <button
              className="chat-widget__close"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              &times;
            </button>
          </div>
          <div className="chat-widget__body">
            <div className="chat-widget__message">
              <div className="chat-widget__avatar">LP</div>
              <div className="chat-widget__bubble">
                Hi there! 👋 How can we help you today? Ask us about plans, migration, or
                technical questions.
              </div>
            </div>
          </div>
          <div className="chat-widget__footer">
            <input type="text" placeholder="Type your message..." aria-label="Chat message" />
            <button aria-label="Send message">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
