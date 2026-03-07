# Mobile API (Tomir)

Base URL:
- `https://tomir-admin.uz`

Headers for all public API calls:
- `Content-Type: application/json`
- `x-api-key: <MOBILE_API_KEY>` if `MOBILE_API_KEY` is set on server

Rate limit:
- About 120 requests/min per IP for public endpoints.

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

Response:
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

Response:
```json
{
  "item": {
    "id": 1,
    "name": "Test Client",
    "phone": "+998901112233",
    "bonus_balance": 12000
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
    "phone": "+998901112233",
    "bonus_balance": 12000
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

### Change password
`PATCH /api/public/customers/{customerId}/password`

Body:
```json
{
  "currentPassword": "1234",
  "newPassword": "5678"
}
```

Response:
```json
{ "ok": true }
```

Errors:
- `400 Missing password`
- `400 Password is not set for this account`
- `401 Invalid current password`

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

### Delete address
`DELETE /api/public/customers/{customerId}/addresses/{addressId}`

Response:
```json
{ "ok": true }
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
- Coordinates are optional; order is still created without them.
- Use `bonusUsed` to spend client bonuses in this order.

### Client order history
`GET /api/public/customers/{customerId}/orders`

Order statuses:
- `paid`
- `accepted`
- `in_delivery`
- `completed`
- `canceled`

---

## 5) Bonuses

### Get bonus balance
`GET /api/public/customers/{customerId}/bonus`

Response:
```json
{
  "item": {
    "customer_id": 1,
    "balance": 12000
  }
}
```

---

## 6) Catalog / Home data

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

## 7) Bootstrap (single call for app startup)

### Bootstrap
`GET /api/mobile/bootstrap`

Returns:
- settings
- active banners
- categories
- active products
- active branches (pickup points)

---

## 8) Mobile integration status

Already available in backend:
- Auth API (register/login)
- Create order API
- Client order history API
- Client addresses API (list/add/delete)
- Profile API (get/update)
- Change password API
- Category products API
- Branches via `/api/mobile/bootstrap`

Not available yet in backend:
- Dedicated search endpoint (can be added as `/api/public/search`)
