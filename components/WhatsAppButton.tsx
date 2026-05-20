"use client";

import { MessageCircle } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/utils";

type Props = {
  phone: string | null | undefined;
  doctorName?: string;
  variant?: "primary" | "icon" | "floating";
  message?: string;
  className?: string;
};

export default function WhatsAppButton({
  phone,
  doctorName,
  variant = "primary",
  message,
  className
}: Props) {
  const defaultMessage =
    message ??
    (doctorName
      ? `Namaste ${doctorName}, I found you on Hanuone and would like to book an appointment.`
      : "Namaste, I found you on Hanuone and would like to book an appointment.");
  const href = buildWhatsAppLink(phone, defaultMessage);
  if (!href) return null;

  const onClick = () => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "whatsapp_click", { doctor: doctorName });
    }
  };

  if (variant === "icon") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contact on WhatsApp"
        onClick={onClick}
        className={`grid h-10 w-10 place-items-center rounded-full bg-whatsapp text-white shadow hover:opacity-90 ${className ?? ""}`}
      >
        <MessageCircle size={18} />
      </a>
    );
  }

  if (variant === "floating") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contact on WhatsApp"
        onClick={onClick}
        className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-whatsapp px-4 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90 ${className ?? ""}`}
      >
        <MessageCircle size={18} />
        WhatsApp
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={`btn-whatsapp ${className ?? ""}`}
    >
      <MessageCircle size={16} />
      WhatsApp
    </a>
  );
}
