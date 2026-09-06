# Mini Market POS

A complete point-of-sale web app for a small grocery / mini market. It runs entirely in the browser with **HTML5, CSS3, and vanilla JavaScript**. All data is stored in **LocalStorage** — no backend and no frameworks.

Open `index.html` in a modern browser (or serve the folder with any static file server).

## Architecture

```
index.html          SPA shell (sidebar + views)
css/                Theme, layout, responsive, print receipt
js/storage.js       LocalStorage keys, JSON helpers, demo seed, money in cents
js/settings.js      Store config + currency formatting + theme
js/products.js      Products + categories + stock status
js/inventory.js     Stock-in / out / adjust / sale / refund history
js/cart.js          Cart, discount, tax, change
js/sales.js         Complete sale, refund, receipt numbers
js/customers.js     Walk-in + registered customers
js/suppliers.js     Vendor records linked to products
js/reports.js       Dashboard and report aggregations
js/app.js           Navigation, UI, shortcuts, receipts
```

### Data models (LocalStorage prefix `mmp_v1_`)

| Key | Contents |
| --- | --- |
| products | Catalog (prices stored as integer cents) |
| categories | Drink, snacks, dairy, … |
| customers | Walk-in + registered |
| suppliers | Vendors |
| sales | Completed / refunded tickets |
| cart | Open checkout (survives refresh) |
| settings | Store name, tax %, currency, theme |
| inventory | Stock movement log |

### Money

All prices and totals use **integer cents**. Display uses `fromCents()`. Tax is `round((subtotal - discount) × taxRate)`.

### POS workflow

1. Search, filter, or scan a barcode (`Enter` on the barcode field).
2. Duplicate scans increase quantity on the same line, never past stock.
3. Set discount, tax (from settings), payment method, and cash received.
4. **Complete sale** writes a receipt, reduces stock, logs inventory, updates the customer, and clears the cart.
5. **Refund** restores stock and marks the ticket refunded.

### Keyboard

- `F1` product search  
- `F2` barcode  
- `F4` complete sale  
- `F8` clear cart  
- `Esc` close modal  

## First run

Demo products (Coca-Cola, milk, rice, detergent, …) are seeded once. Use **Settings → Reset demo data** to start over.
