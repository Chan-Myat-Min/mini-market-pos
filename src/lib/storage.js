/**
 * LocalStorage persistence and first-run demo seed.
 * Money is stored and calculated in integer cents to avoid float errors.
 */
const PREFIX = "mmp_v1_";

export const KEYS = {
  products: "products",
  categories: "categories",
  customers: "customers",
  suppliers: "suppliers",
  sales: "sales",
  cart: "cart",
  settings: "settings",
  inventory: "inventory",
  seeded: "seeded",
};

function rawKey(key) {
  return PREFIX + key;
}

export function get(key, fallback) {
  try {
    const raw = localStorage.getItem(rawKey(key));
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function set(key, value) {
  localStorage.setItem(rawKey(key), JSON.stringify(value));
}

export function uid(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function toCents(value) {
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fromCents(cents) {
  const n = Number(cents) || 0;
  return (n / 100).toFixed(2);
}

export function nowIso() {
  return new Date().toISOString();
}

export function defaultSettings() {
  return {
    storeName: "CRAZY Mobile Shop POS",
    address: "128 Market Street, Downtown",
    phone: "+1 (555) 014-2288",
    taxPercent: 8,
    currency: "USD",
    currencySymbol: "$",
    receiptFooter: "Thank you for shopping with us. Come again soon!",
    lowStockThreshold: 8,
    theme: "light",
    cashierName: "Cashier 1",
    showSellingCost: true,
  };
}

export function defaultCart() {
  return {
    items: [],
    discountCents: 0,
    paymentMethod: "cash",
    amountReceivedCents: 0,
    customerId: "",
  };
}

export function getProducts() {
  return get(KEYS.products, []);
}
export function saveProducts(list) {
  set(KEYS.products, list);
}
export function getCategories() {
  return get(KEYS.categories, []);
}
export function saveCategories(list) {
  set(KEYS.categories, list);
}
export function getSales() {
  return get(KEYS.sales, []);
}
export function saveSales(list) {
  set(KEYS.sales, list);
}
export function saveSale(sale) {
  const list = getSales();
  const idx = list.findIndex((s) => s.id === sale.id);
  if (idx >= 0) list[idx] = sale;
  else list.unshift(sale);
  saveSales(list);
  return sale;
}
export function getCustomers() {
  return get(KEYS.customers, []);
}
export function saveCustomers(list) {
  set(KEYS.customers, list);
}
export function getSuppliers() {
  return get(KEYS.suppliers, []);
}
export function saveSuppliers(list) {
  set(KEYS.suppliers, list);
}
export function getSettings() {
  return Object.assign(defaultSettings(), get(KEYS.settings, {}));
}
export function saveSettings(settings) {
  set(KEYS.settings, Object.assign(defaultSettings(), settings));
}
export function getCart() {
  return Object.assign(defaultCart(), get(KEYS.cart, {}));
}
export function saveCart(cart) {
  set(KEYS.cart, Object.assign(defaultCart(), cart));
}
export function getInventoryHistory() {
  return get(KEYS.inventory, []);
}
export function saveInventoryHistory(list) {
  set(KEYS.inventory, list);
}

function p(name, sku, barcode, categoryId, unit, sell, cost, stock, minStock, icon, supplierId) {
  return {
    id: uid("prd"),
    name,
    sku,
    barcode,
    categoryId,
    unit,
    sellingPriceCents: sell,
    costPriceCents: cost,
    stock,
    minStock,
    icon,
    image: "",
    supplierId,
    expiryDate: "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

export function seedIfNeeded() {
  if (get(KEYS.seeded, false)) return;

  const cat = [
    { id: "cat_drinks", name: "Drinks" },
    { id: "cat_snacks", name: "Snacks" },
    { id: "cat_dairy", name: "Dairy" },
    { id: "cat_bakery", name: "Bakery" },
    { id: "cat_fruits", name: "Fruits" },
    { id: "cat_veg", name: "Vegetables" },
    { id: "cat_frozen", name: "Frozen Food" },
    { id: "cat_house", name: "Household" },
    { id: "cat_care", name: "Personal Care" },
    { id: "cat_other", name: "Other" },
  ];

  const suppliers = [
    {
      id: "sup_bevco",
      name: "BevCo Distributors",
      contactPerson: "Maya Chen",
      phone: "+1 555 201 1100",
      email: "maya@bevco.example",
      address: "40 Warehouse Rd",
    },
    {
      id: "sup_fresh",
      name: "Green Valley Produce",
      contactPerson: "Luis Romero",
      phone: "+1 555 201 2200",
      email: "luis@greenvalley.example",
      address: "9 Farm Gate Ave",
    },
    {
      id: "sup_home",
      name: "HomeCare Wholesale",
      contactPerson: "Priya Shah",
      phone: "+1 555 201 3300",
      email: "priya@homecare.example",
      address: "77 Industrial Blvd",
    },
  ];

  const products = [
    p("Coca-Cola 500ml", "SKU-DRK-001", "5449000000996", "cat_drinks", "bottle", 150, 80, 48, 10, "🥤", "sup_bevco"),
    p("Pepsi 500ml", "SKU-DRK-002", "012000161559", "cat_drinks", "bottle", 145, 78, 40, 10, "🥤", "sup_bevco"),
    p("Mineral Water 600ml", "SKU-DRK-003", "8901030865123", "cat_drinks", "bottle", 90, 35, 80, 15, "💧", "sup_bevco"),
    p("Orange Juice 1L", "SKU-DRK-004", "8901030865999", "cat_drinks", "carton", 320, 180, 18, 6, "🧃", "sup_bevco"),
    p("Potato Chips", "SKU-SNK-001", "028400064057", "cat_snacks", "bag", 199, 90, 36, 8, "🍟", "sup_home"),
    p("Chocolate Bar", "SKU-SNK-002", "034000123456", "cat_snacks", "bar", 125, 55, 50, 10, "🍫", "sup_home"),
    p("Instant Noodles", "SKU-SNK-003", "0898089001234", "cat_snacks", "pack", 89, 40, 72, 12, "🍜", "sup_home"),
    p("Coffee 200g", "SKU-OTH-001", "0999888777665", "cat_other", "pack", 650, 380, 14, 5, "☕", "sup_home"),
    p("Milk 1L", "SKU-DRY-001", "041000012345", "cat_dairy", "carton", 210, 130, 22, 8, "🥛", "sup_fresh"),
    p("Eggs (12)", "SKU-DRY-002", "041000054321", "cat_dairy", "tray", 340, 210, 16, 6, "🥚", "sup_fresh"),
    p("Cheddar Cheese 200g", "SKU-DRY-003", "041000099887", "cat_dairy", "pack", 425, 250, 9, 4, "🧀", "sup_fresh"),
    p("White Bread", "SKU-BKY-001", "072250037421", "cat_bakery", "loaf", 250, 120, 12, 5, "🍞", "sup_fresh"),
    p("Croissant", "SKU-BKY-002", "072250037555", "cat_bakery", "pc", 180, 70, 20, 6, "🥐", "sup_fresh"),
    p("Bananas 1kg", "SKU-FRT-001", "4011", "cat_fruits", "kg", 149, 70, 25, 8, "🍌", "sup_fresh"),
    p("Red Apples 1kg", "SKU-FRT-002", "4131", "cat_fruits", "kg", 299, 160, 18, 6, "🍎", "sup_fresh"),
    p("Tomatoes 1kg", "SKU-VEG-001", "4664", "cat_veg", "kg", 220, 110, 15, 6, "🍅", "sup_fresh"),
    p("Onions 1kg", "SKU-VEG-002", "4665", "cat_veg", "kg", 130, 55, 30, 8, "🧅", "sup_fresh"),
    p("Frozen Pizza", "SKU-FRZ-001", "024100112233", "cat_frozen", "box", 599, 320, 10, 4, "🍕", "sup_home"),
    p("Ice Cream 500ml", "SKU-FRZ-002", "024100145678", "cat_frozen", "tub", 449, 240, 8, 4, "🍨", "sup_home"),
    p("Laundry Detergent", "SKU-HSE-001", "037000318943", "cat_house", "bottle", 799, 430, 11, 4, "🧴", "sup_home"),
    p("Dish Soap", "SKU-HSE-002", "037000318111", "cat_house", "bottle", 275, 140, 20, 6, "🧼", "sup_home"),
    p("Shampoo 400ml", "SKU-PCR-001", "301426028001", "cat_care", "bottle", 549, 290, 13, 5, "💆", "sup_home"),
    p("Toothpaste", "SKU-PCR-002", "301426028222", "cat_care", "tube", 299, 150, 24, 6, "😁", "sup_home"),
    p("Sugar 1kg", "SKU-OTH-002", "8901030001111", "cat_other", "bag", 175, 95, 28, 8, "🍬", "sup_home"),
    p("Rice 5kg", "SKU-OTH-003", "8901030002222", "cat_other", "bag", 1299, 820, 7, 4, "🍚", "sup_home"),
  ];

  const customers = [
    {
      id: "cust_walkin",
      name: "Walk-in Customer",
      phone: "",
      email: "",
      address: "",
      totalPurchasesCents: 0,
      lastPurchase: "",
      walkIn: true,
    },
    {
      id: "cust_anna",
      name: "Anna Park",
      phone: "+1 555 300 4411",
      email: "anna.park@example.com",
      address: "14 Oak Lane",
      totalPurchasesCents: 0,
      lastPurchase: "",
      walkIn: false,
    },
  ];

  saveCategories(cat);
  saveSuppliers(suppliers);
  saveProducts(products);
  saveCustomers(customers);
  saveSales([]);
  saveInventoryHistory([]);
  saveCart(defaultCart());
  saveSettings(defaultSettings());
  set(KEYS.seeded, true);
}

export function resetAllData() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(rawKey(k)));
  seedIfNeeded();
}
