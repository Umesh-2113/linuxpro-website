"use client";

import { useRef } from "react";
import { AnimateOnScroll } from "./AnimateOnScroll";
import { faqItems } from "@/lib/data";

export function FAQ() {
  const listRef = useRef<HTMLDivElement>(null);

  const handleToggle = (index: number, open: boolean) => {
    if (!open || !listRef.current) return;
    const items = listRef.current.querySelectorAll("details");
    items.forEach((item, i) => {
      if (i !== index) (item as HTMLDetailsElement).open = false;
    });
  };

  return (
    <section className="faq" id="faq">
      <div className="container">
        <AnimateOnScroll className="section-header">
          <span className="section-tag">FAQ</span>
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-desc">Got questions? We&apos;ve got answers.</p>
        </AnimateOnScroll>
        <AnimateOnScroll>
          <div className="faq__list" ref={listRef}>
            {faqItems.map((item, i) => (
              <details
                key={item.question}
                className="faq__item glass"
                onToggle={(e) => handleToggle(i, (e.target as HTMLDetailsElement).open)}
              >
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
