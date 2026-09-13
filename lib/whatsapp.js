// Builds a wa.me link that opens a WhatsApp chat with a pre-filled message.
// Note: wa.me can only pre-fill TEXT, not attach a file/image - the student
// still has to manually attach their receipt photo in the WhatsApp app.

export function normalizeNigerianPhone(input) {
  const digits = String(input || "").replace(/[^0-9]/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return digits;
}

export function buildWhatsAppLink(phone, message = "") {
  const intlPhone = normalizeNigerianPhone(phone);
  const params = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${intlPhone}${params}`;
}
