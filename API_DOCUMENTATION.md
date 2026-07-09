# VibeBook Backend API Documentation

## Base URL

http://localhost:5000

---

# Authentication

## Register

POST /api/auth/register

### Body

```json
{
  "full_name": "Fatime",
  "email": "fatime@gmail.com",
  "phone": "+994501112233",
  "password": "123456"
}
```

Response

```json
{
  "success": true,
  "token": "...",
  "user": {}
}
```

Status

- 201 Created
- 400 Bad Request

---

## Login

POST /api/auth/login

Body

```json
{
  "email":"fatime@gmail.com",
  "password":"123456"
}
```

Status

- 200 OK
- 401 Unauthorized

---

# Products

GET /api/products

GET /api/products/:id

POST /api/products

PUT /api/products/:id

DELETE /api/products/:id

---

# Categories

GET /api/categories

POST /api/categories

PUT /api/categories/:id

DELETE /api/categories/:id

---

# Covers

GET /api/covers

POST /api/covers

PUT /api/covers/:id

DELETE /api/covers/:id

---

# Templates

GET /api/templates

POST /api/templates

PUT /api/templates/:id

DELETE /api/templates/:id

---

# Albums

POST /api/albums

GET /api/albums/:id

PUT /api/albums/:id

DELETE /api/albums/:id

---

# Album Pages

POST /api/albums/:id/pages

DELETE /api/pages/:id

---

# Photos

POST /api/pages/:id/photos

PUT /api/photos/:id

DELETE /api/photos/:id

---

# Text Layers

POST /api/pages/:id/text

PUT /api/text/:id

DELETE /api/text/:id

---

# Orders

GET /api/admin/orders

GET /api/admin/orders/:id

PUT /api/admin/orders/:id/status

DELETE /api/admin/orders/:id

---

# Settings

GET /api/admin/settings

PUT /api/admin/settings

---

# Upload

POST /api/upload

multipart/form-data

field:

image

Response

```json
{
  "success": true,
  "data": {
    "path": "uploads/example.jpg"
  }
}
```

---

Authorization

Bütün protected endpointlər üçün:

Authorization:

Bearer YOUR_TOKEN