"use client";

import { FormEvent, useState } from "react";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  if (sent) {
    return (
      <div className="contact-form glass">
        <h2>Message Sent!</h2>
        <p>Thank you for reaching out. Our team will respond within 2 hours.</p>
      </div>
    );
  }

  return (
    <form className="contact-form glass auth-form" onSubmit={handleSubmit}>
      <h2>Send us a message</h2>
      <div className="auth-form__field">
        <label htmlFor="contact-name">Name</label>
        <input id="contact-name" required placeholder="Your name" />
      </div>
      <div className="auth-form__field">
        <label htmlFor="contact-email">Email</label>
        <input id="contact-email" type="email" required placeholder="you@company.com" />
      </div>
      <div className="auth-form__field">
        <label htmlFor="contact-subject">Subject</label>
        <select id="contact-subject" required>
          <option value="">Select a topic</option>
          <option>Sales inquiry</option>
          <option>Technical support</option>
          <option>Migration help</option>
          <option>Billing question</option>
          <option>Other</option>
        </select>
      </div>
      <div className="auth-form__field">
        <label htmlFor="contact-message">Message</label>
        <textarea id="contact-message" rows={5} required placeholder="How can we help?" />
      </div>
      <button type="submit" className="btn btn--primary btn--lg">Send Message</button>
    </form>
  );
}
