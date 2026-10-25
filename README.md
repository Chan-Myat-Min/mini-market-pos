# Mini Market POS

A grocery point-of-sale app built with **React**, **Vite**, HTML, and CSS. Business data stays in **LocalStorage** — no backend.

## Run

```bash
npm install
npm run dev
```

Then open the Vite URL (usually `http://localhost:5173`).

Production build:

```bash
npm run build
npm run preview
```

## Architecture

```
src/main.jsx          React entry
src/App.jsx           Shell, nav, shortcuts, receipts
src/views/            Dashboard, POS, products, inventory, …
src/components/       Shared cards, tables, receipt
src/lib/              Domain logic (same LocalStorage models as before)
css/                  Theme, responsive layout, print receipt
```

Existing browser data under the `mmp_v1_` keys continues to work after this React conversion.

### Money

Prices are integer cents. Tax is `round((subtotal - discount) × taxRate)`.

### Keyboard

- `F1` product search
- `F2` barcode
- `F4` complete sale
- `F8` clear cart
- `Esc` close modal
