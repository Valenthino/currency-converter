# Currency Converter

A calm, precise multi-currency converter with an Apple-style calculator keypad.
Live at **currency.vavqo.com** (Coolify, Docker, port 3000, health check `/api/health`).

## Features

- Convert one amount into every selected currency (tap a row to make it the base; ⇅ swaps with the first row).
- Calculator keypad: `+ − × ÷ % +/− ⌫ AC =` with normal operator precedence; the expression shows above the result and every row updates live. Keyboard works too (digits, `+ - * /`, Enter, Backspace, Esc).
- Switching currency rounds the amount to that currency's normal decimals (USD 2, XOF 0…).
- Works offline after one visit: a service worker (`public/sw.js`) caches the app, and the last rates are saved on the device.

## Development

```bash
npm ci
npm run dev     # http://localhost:3000
npm test        # calculator engine tests
npm run lint
npm run build
```

The service worker only registers in production builds (`npm run build && npm start`).
