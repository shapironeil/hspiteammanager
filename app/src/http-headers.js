'use strict';
// Intestazioni di sicurezza comuni a tutte le risposte del portale.
// connect-src: le pagine del portale possono parlare con il motore locale di HSPI Client (127.0.0.1:4320) sul PC di chi le usa.
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy':
    "default-src 'self'; connect-src 'self' http://127.0.0.1:4320; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
};

module.exports = { SECURITY_HEADERS };
