# Mobile API (Tomir)

Base URL:
- `https://tomir-admin.uz`

Headers for all public API calls:
- `Content-Type: application/json`
- `x-api-key: <MOBILE_API_KEY>` if `MOBILE_API_KEY` is set on server

Rate limit:
- ~120 requests per minute per IP for public endpoints.

---

## 1) Auth / Client

### Register
`POST /api/public/customers`

Body:
```json
{
  "name": "Test Client",
  "phone": "+998901112233",
  "password": "1234"
}
```

Response 200:
```json
{ "id": 1 }
```

Errors:
- `400 Missing data`
- `409 Phone already exists`
- `401 Invalid API key`

### Login
`POST /api/public/auth/login`

Body:
```json
{
  "phone": "+998901112233",
  "password": "1234"
}
```

Response 200:
```json
{
  "item": {
    "id": 1,
    "name": "Test Client",
    "phone": "+998901112233"
  }
}
```

Errors:
- `400 Missing data`
- `401 Invalid credentials`

---

## 2) Client profile

### Get profile
`GET /api/public/customers/{customerId}/profile`

Response:
```json
{
  "item": {
    "id": 1,
    "name": "Test Client",
    "phone": "+998901112233"
  }
}
```

### Update profile
`PATCH /api/public/customers/{customerId}/profile`

Body (at least one field):
```json
{
  "name": "New Name",
  "phone": "+998901112244"
}
```

---

## 3) Addresses

### List addresses
`GET /api/public/customers/{customerId}/addresses`

### Add address
`POST /api/public/customers/{customerId}/addresses`

Body:
```json
{
  "label": "Дом",
  "addressLine": "Ташкент, Юнусабад 12",
  "comment": "Домофон 45",
  "isDefault": true
}
```

Response:
```json
{ "id": 10 }
```

---

## 4) Orders

### Create order
`POST /api/public/orders`

Body:
```json
{
  "customerId": 1,
  "customerName": "Test Client",
  "customerPhone": "+998901112233",
  "addressId": 10,
  "addressLine": "Ташкент, Юнусабад 12",
  "addressLabel": "Дом",
  "addressComment": "Позвонить заранее",
  "comment": "Без звонка в дверь",
  "paymentMethod": "cash",
  "deliveryLat": 41.31,
  "deliveryLng": 69.28,
  "bonusUsed": 0,
  "items": [
    {
      "productId": 2,
      "titleRu": "Товар",
      "titleUz": "Mahsulot",
      "price": 45000,
      "quantity": 2
    }
  ]
}
```

Response:
```json
{
  "id": 123,
  "branchId": 2
}
```

Notes:
- `items` and `paymentMethod` are required.
- Coordinates are optional now; if missing, order is still created and assigned by fallback logic.

### Client order history
`GET /api/public/customers/{customerId}/orders`

Response:
```json
{
  "items": [
    {
      "id": 123,
      "status": "paid",
      "total_amount": 90000,
      "created_at": "2026-03-07T12:00:00.000Z",
      "items": [
        {
          "title_ru": "Товар",
          "price": 45000,
          "quantity": 2,
          "total": 90000
        }
      ],
      "address": {},
      "courier": null
    }
  ]
}
```

Order statuses:
- `paid`
- `accepted`
- `in_delivery`
- `completed`
- `canceled`

---

## 5) Catalog / Home data

### Settings
`GET /api/public/settings`

### Banners
`GET /api/public/banners`

### Categories
`GET /api/public/categories`

### Products (all active)
`GET /api/public/products`

### Products by category
`GET /api/public/categories/{categoryId}/products`

---

## 6) Bootstrap (single call for app startup)

### Mobile bootstrap
`GET /api/mobile/bootstrap`

Returns:
- settings
- active banners
- categories
- active products
- active branches (pickup points)

Use this endpoint to replace hardcoded pickup points in mobile app.

---

## 7) Mapping to current mobile gaps

Already available in backend:
- Auth API (register/login)
- Create order API
- Client history API
- Client addresses API
- Profile get/update API
- Category products API
- Branches data via `/api/mobile/bootstrap`

Not available yet in backend (needs new endpoint if required):
- Password change API for client
- Dedicated search endpoint (can be done client-side using `/api/public/products`, or we can add `/api/public/search`)

