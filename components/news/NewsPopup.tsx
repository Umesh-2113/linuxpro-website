"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { whatsappChatUrl } from "@/lib/contact";
import { fetchActiveNews, newsVariantLabels, type NewsItem } from "@/lib/news";
import {
  defaultNewsPopupSettings,
  fetchNewsPopupSettings,
  type NewsPopupSettings,
} from "@/lib/news-settings";

const SEEN_KEY = "linuxpro_news_seen";

function readSeen(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeSeen(ids: string[]) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(new Set(ids))));
  } catch {
    /* ignore storage errors */
  }
}

export function clearNewsSeen(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SEEN_KEY);
    localStorage.removeItem(SEEN_KEY);
  } catch {
    /* ignore storage errors */
  }
}

export function NewsPopup({ enabled = true }: { enabled?: boolean }) {
  const { status } = useSession();
  const [queue, setQueue] = useState<NewsItem[]>([]);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [popupSettings, setPopupSettings] = useState<NewsPopupSettings>(
    defaultNewsPopupSettings
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!enabled || status !== "authenticated") return;
    let cancelled = false;

    async function load() {
      try {
        const [items, settings] = await Promise.all([
          fetchActiveNews(),
          fetchNewsPopupSettings(),
        ]);
        if (cancelled) return;
        setPopupSettings(settings);
        if (!Array.isArray(items) || items.length === 0) return;
        const seen = readSeen();
        const unseen = items.filter((item) => !seen.includes(item.id));
        if (unseen.length > 0) {
          setQueue(unseen);
          setIndex(0);
          setOpen(true);
        }
      } catch {
        /* silently ignore — news is non-critical */
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [status, enabled]);

  const markSeen = (ids: string[]) => {
    writeSeen([...readSeen(), ...ids]);
  };

  const dismissAll = () => {
    markSeen(queue.map((item) => item.id));
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissAll();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, queue]);

  if (!open || queue.length === 0) return null;

  const current = queue[index];
  const total = queue.length;
  const isLast = index >= total - 1;
  const chatUrl = whatsappChatUrl(popupSettings.whatsappNumber);
  const joinLink = popupSettings.whatsappJoinLink.trim();

  const next = () => {
    markSeen([current.id]);
    if (isLast) {
      setOpen(false);
    } else {
      setIndex((i) => i + 1);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="news-popup__overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Announcement"
      onClick={dismissAll}
    >
      <div
        className={`news-popup news-popup--${current.variant}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="news-popup__close"
          aria-label="Close announcement"
          onClick={dismissAll}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="news-popup__head">
          <span className={`news-tag news-tag--${current.variant}`}>
            {newsVariantLabels[current.variant]}
          </span>
          {total > 1 && (
            <span className="news-popup__counter">
              {index + 1} / {total}
            </span>
          )}
        </div>

        <h3 className="news-popup__title">{current.title}</h3>
        <p className="news-popup__body">{current.body}</p>

        <div className="news-popup__contact">
          <div className="news-popup__contact-row">
            <span>Phone</span>
            <a href={`tel:${popupSettings.contactPhone.replace(/\s/g, "")}`}>
              {popupSettings.contactPhone}
            </a>
          </div>
          <div className="news-popup__contact-row">
            <span>Email</span>
            <a href={`mailto:${popupSettings.contactEmail}`}>{popupSettings.contactEmail}</a>
          </div>
        </div>

        {(chatUrl || joinLink) && (
          <div className="news-popup__whatsapp">
            {chatUrl && (
              <a
                href={chatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="news-popup__wa-btn news-popup__wa-btn--chat"
              >
                Chat on WhatsApp
              </a>
            )}
            {joinLink && (
              <a
                href={joinLink}
                target="_blank"
                rel="noopener noreferrer"
                className="news-popup__wa-btn news-popup__wa-btn--join"
              >
                Join WhatsApp Channel
              </a>
            )}
          </div>
        )}

        <div className="news-popup__actions">
          {total > 1 && !isLast && (
            <button type="button" className="btn btn--ghost" onClick={dismissAll}>
              Dismiss all
            </button>
          )}
          <button type="button" className="btn btn--primary" onClick={next}>
            {isLast ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
