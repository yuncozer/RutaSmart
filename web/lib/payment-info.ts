/**
 * Instrucciones de pago mostradas al cliente (MVP: pago manual).
 * Edita estos datos con las cuentas reales de RutaSmart.
 */
export const PAYMENT_METHODS = [
  {
    name: "Pago móvil (VE)",
    detail: "Banco de Venezuela · 0102 · C.I. V-00.000.000 · 0414-000-0000",
  },
  { name: "Zelle", detail: "pagos@rutasmart.app · RutaSmart LLC" },
  { name: "Binance Pay", detail: "ID 000000000 · USDT" },
  { name: "Transferencia (CO)", detail: "Bancolombia · Ahorros 000-000000-00 · NIT 000.000.000-0" },
];

export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

export function whatsappLink(message: string) {
  return WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
    : null;
}
