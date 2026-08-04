import { siteContact, whatsappChatUrl } from "@/lib/contact";

export function HomeWhatsAppFloat() {
  const url = whatsappChatUrl(siteContact.phone);
  if (!url) return null;

  return (
    <a
      href={url}
      className="ol-whatsapp-float"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
    >
      <span aria-hidden>💬</span>
      WhatsApp
    </a>
  );
}
