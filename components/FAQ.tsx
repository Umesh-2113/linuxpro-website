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
    <section className="ol-section ol-faq" id="faq">
      <div className="container">
        <AnimateOnScroll className="ol-section-head ol-section-head--center">
          <span className="ol-section-tag">FAQ</span>
          <h2>Frequently Asked Questions</h2>
          <p>Got questions? We&apos;ve got answers.</p>
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
