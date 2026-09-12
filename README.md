# Self-Service Checkout Web Application

Self-service checkout for a snack bar: a customer browses a touchscreen menu, builds an order, pays, and gets a confirmation — no cashier required.

## Architecture

Three components run via Docker Compose:

```
web (Angular + Nginx)  ── /api/* proxy ──▶  api (NestJS)  ──▶  mysql (8.4)
     128.0.0.1:8088                        localhost:3000
```

- **web** — Angular 22 standalone components served by Nginx. The browser only ever talks to `/api/*` on the same origin; Nginx proxies those requests to the API container, so there are no cross-domain requests from the tablet.
- **api** — NestJS REST API. It is the single source of truth for the menu, product availability, and prices. On boot it runs the database migration/seed script and then starts serving.
- **mysql** — MariaDB-compatible MySQL 8.4 with a persisted volume. It is internal to the Compose network (not exposed on the host) and only reachable from the API container.

The frontend is a single page with three states (browse → checkout dialog → confirmation) plus overlays for Help and the inactivity warning. There is no routing; state lives in Angular signals.

## Running locally

Requirements: Docker with Compose v2.

```bash
cp .env.example .env
docker compose up --build
```

Then open <http://localhost:8088>.

The API is also reachable directly at <http://localhost:3000> (e.g. `curl http://localhost:3000/api/health`).

### Environment variables

All settings live in `.env` (see `.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `MYSQL_DATABASE` | `self_checkout` | Database name |
| `MYSQL_USER` / `MYSQL_PASSWORD` | `checkout` / `checkout` | Application DB account |
| `MYSQL_ROOT_PASSWORD` | `root` | Root account (used only by MySQL init) |
| `API_PORT` / `API_HOST` | `3000` / `0.0.0.0` | API bind |
| `INACTIVITY_TIMEOUT_SECONDS` | `120` | Idle time before the "Are you still there?" warning |
| `INACTIVITY_WARNING_SECONDS` | `15` | Countdown shown in the warning before the order is cleared |

The inactivity values are injected into the web container at boot as `assets/config.json`.

### Development without Docker

- Database: start MySQL locally with a database/user matching the env vars above.
- API: `cd api && npm install && node ../database/migrate.js && npm run start:dev`
- Web: `cd web && npm install && npm start` (uses `proxy.conf.json` to forward `/api` to `localhost:3000`).

## Database

Migrations and seed data live in `database/`:

```
database/
├── migrate.js              Node runner (no framework)
├── migrations/
│   ├── 001_create_catalog.sql
│   └── 002_create_orders.sql
└── seeds/
    └── 001_seed_menu.sql
```

The runner creates the database if needed, tracks applied files in a `schema_migrations` table, and applies any pending migration or seed in filename order. It is idempotent and runs automatically when the API container starts, so the app initializes itself from an empty database.

Schema highlights:

- `products.price` is `DECIMAL(10,2)`.
- `orders` has a `UNIQUE(idempotency_key)` constraint (the backbone of idempotency) plus status and totals.
- `order_items` snapshots `product_name` and `unit_price` at order time, so later menu price changes never affect existing orders.
- Foreign keys and indexes cover category lookup and order-item integrity.

## API

All endpoints are prefixed with `/api`.

### `GET /api/health`

```json
{ "status": "ok" }
```

### `GET /api/menu`

```json
{
  "categories": [{ "id": 1, "name": "Hot Dogs" }],
  "items": [
    {
      "id": "hotdog-001",
      "categoryId": 1,
      "name": "Classic Hot Dog",
      "description": "Grilled sausage, ketchup, mustard and crispy potato sticks",
      "price": 12.9,
      "available": true
    }
  ]
}
```

### `POST /api/orders`

Request:

```json
{
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
  "items": [{ "productId": "hotdog-001", "quantity": 2 }],
  "payment": { "method": "CARD" }
}
```

The client never sends prices; the API resolves each product from the database and computes the authoritative total. Any extra JSON fields (like a client-supplied `price`) are stripped and ignored.

Response (new order):

```json
{
  "orderId": "1",
  "status": "PAID",
  "paymentMethod": "CARD",
  "total": 25.8,
  "createdAt": "2026-09-11T12:22:35.000Z",
  "items": [
    { "productId": "hotdog-001", "name": "Classic Hot Dog", "quantity": 2, "unitPrice": 12.9 }
  ],
  "replayed": false
}
```

Replaying the same `idempotencyKey` returns the original order with `"replayed": true` instead of creating a new one.

Errors are returned as `{ "statusCode": <code>, "message": "<human-readable pt-BR text>" }`:

| Case | Status |
| --- | --- |
| Invalid body / unknown fields | `400` |
| Product does not exist | `404` |
| Product is unavailable | `409` |
| Anything internal | `500` (generic message, no stack traces or SQL) |

`payment.method` accepts `CARD` or `PIX`; both are simulated (no real payment processing).

## Design decisions

- **Why MySQL.** The challenge specified it, and its strong transactional guarantees (InnoDB, `UNIQUE` constraints, proper decimal types) are exactly what idempotent order creation and authoritative money math need.
- **Idempotency.** Two layers: a database-level `UNIQUE(idempotency_key)` and application logic. On submit, the service reads an existing order by key (fast-path replay), otherwise inserts inside a transaction; if a concurrent insert hits the unique constraint (`ER_DUP_ENTRY`), it rolls back and re-reads the winning order. A lost response plus a customer retry therefore can never create a second order.
- **Authoritative prices.** The menu endpoint is the only source of prices. Order totals are computed server-side from database rows using integer cents; the client only mirrors totals for display. Client-sent `price` fields are dropped by strict DTO validation (`whitelist: true`).
- **Price snapshots.** `order_items` stores `product_name`/`unit_price` copied at creation time, satisfying the requirement that later price changes do not rewrite history.
- **localStorage.** The cart persists only `{ items: [{ productId, quantity }] }` — no prices, no payment data. On load the app reconciles stored IDs against the live menu: removed products are flagged "not available anymore" and unavailable ones "temporarily unavailable"; affected lines stay visible but block checkout until removed or adjusted.
- **Abandoned sessions.** A client-side timer resets on meaningful interaction (tap/move/keystroke). After `INACTIVITY_TIMEOUT_SECONDS` an overlay counts down `INACTIVITY_WARNING_SECONDS`; any interaction cancels it, and hitting zero clears the cart, localStorage, and Help panel and reloads the menu. The two timeouts are configurable via env vars.
- **Failure handling.** A global exception filter converts every error into a friendly pt-BR message and never leaks internals. The checkout dialog distinguishes a failed submit from a lost response by reusing the same idempotency key: retrying either shows the created order (via replay) or a real error, never a duplicate.
- **Help.** A self-contained `SupportService` owns the mock chat. Swapping it for a real AI/human agent later only changes that service; the checkout domain is untouched.
- **Observability.** NestJS logging records order creation, replays, validation failures, and submission errors with `orderId`/`idempotencyKey` context; payment details are never logged.

## Known limitations

- Payment is simulated: `CARD`/`PIX` are recorded but no gateway is contacted.
- No stock/limits: quantities are only bounded client-side (≤ 99) and by validation.
- Single tablet, one checkout at a time; no concurrent-order locking concerns.
- No admin UI or order management endpoints.
- SQL migrations are raw `*.sql` files applied by a small custom runner rather than an ORM migration framework.

## Future improvements

- Real payment provider integration (tokenized card, PIX QR code) with payment webhooks and status transitions.
- Real-time kitchen display / order status tracking.
- AI or human support backend behind the existing `SupportService` interface.
- Admin interface for product/price/availability management.
- Metrics and tracing (prometheus/OpenTelemetry) alongside the existing structured logs.