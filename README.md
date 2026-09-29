# Ecommerce Web

A modern, responsive one-page storefront powered by a live products API. Product cards, categories, ratings, prices, stock status, and Cloudinary image URLs are rendered from API data; the application does not include a local sample catalog.

## Features

- Live API product catalog with loading, error, retry, and empty states
- Categories derived dynamically from product records
- Product search, category and availability filters, and price/rating/newest sorting
- Product quick view with API-backed details
- Client-side wishlist and cart drawer
- Cart quantity controls, subtotal, and inventory-aware purchase limits
- Out-of-stock indicators and disabled purchase actions
- Responsive layouts and accessible dialogs/interactions

## Tech Stack

- React 19 and JavaScript
- Vite 8
- Tailwind CSS 4 through the Vite plugin, with project-specific storefront CSS
- Framer Motion
- Lucide React
- Oxlint

## Products API

The storefront requests products with:

```text
GET https://ecommerce-api-8ga2.onrender.com/api/product
```

The endpoint currently returns a JSON array. The response normalizer also accepts common `products`, `data`, and `results` wrappers. Product images use each record's `url` directly. The API must allow browser requests from the storefront origin (CORS).

## Local Setup

```sh
git clone https://github.com/Vikaspatel088/Ecommerce-Web.git
cd Ecommerce-Web
npm install
cp .env.example .env
npm run dev
```

On Windows, create `.env` by copying `.env.example` in File Explorer or with PowerShell:

```powershell
Copy-Item .env.example .env
```

The example already sets `VITE_PRODUCTS_API_URL` to the public products endpoint. Keep `.env` local; it is ignored by Git. Optionally set `VITE_CURRENCY` to an ISO 4217 currency code for currency-symbol formatting. The endpoint supplies numeric prices without a currency code.

## Production Build

```sh
npm run lint
npm run build
```

## Project Structure

```text
src/
  App.jsx          Storefront components and client-side catalog/cart state
  base.css         Tailwind entry and global base styles
  storefront.css   Storefront layout, theme, and responsive styles
index.html         Vite document and page metadata
vite.config.js     React and Tailwind Vite plugins
.env.example       Safe local API configuration template
```

## Notes

The cart is client-side only. Checkout and account actions are presentation-only and are not connected to payment, authentication, or order services.
