import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { useCompareIds } from "@/lib/compare";

/** WhatsApp logo (lucide has no brand icons for it) */
const WhatsAppIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.21-3.58.94.96-3.49-.23-.36a9.44 9.44 0 0 1-1.45-5.03c0-5.22 4.25-9.47 9.48-9.47a9.4 9.4 0 0 1 6.7 2.78 9.4 9.4 0 0 1 2.77 6.7c0 5.22-4.25 9.46-9.47 9.46zm8.06-17.53A11.33 11.33 0 0 0 12.04.63C5.76.63.65 5.73.65 12.01c0 2 .52 3.96 1.52 5.69L.55 23.6l6.04-1.58a11.35 11.35 0 0 0 5.44 1.39h.01c6.28 0 11.39-5.11 11.39-11.39 0-3.04-1.18-5.9-3.33-8.05z" />
  </svg>
);

/** Floating "Chat on WhatsApp" button on public pages, using the number in Admin -> Company. */
const WhatsAppButton = () => {
  const { pathname } = useLocation();
  const comparing = useCompareIds().length > 0;
  const [number, setNumber] = useState("");

  useEffect(() => {
    api
      .getSiteProfile()
      .then((p) => setNumber(String(p?.whatsappNumber || "").replace(/\D/g, "")))
      .catch(() => setNumber(""));
  }, []);

  if (!number || pathname.startsWith("/admin")) return null;
  // Project pages already have WhatsApp in the bar at the bottom on phones.
  const onProject = pathname.startsWith("/project/");
  const text = encodeURIComponent(
    onProject ? `Hi, I'm interested in a project I saw on your website: ${window.location.href}` : "Hi, I'd like help finding a home.",
  );

  return (
    <a
      href={`https://wa.me/${number}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className={`group fixed right-4 z-40 items-center gap-2 rounded-full bg-[#25D366] p-3.5 text-white shadow-lg transition hover:scale-105 hover:shadow-xl md:right-6 ${
        onProject ? "hidden lg:flex" : "flex"
      } ${comparing ? "bottom-24" : "bottom-5 md:bottom-6"}`}
    >
      <WhatsAppIcon className="h-6 w-6" />
      <span className="hidden pr-1 text-sm font-semibold md:inline">Chat with us</span>
    </a>
  );
};

export default WhatsAppButton;
