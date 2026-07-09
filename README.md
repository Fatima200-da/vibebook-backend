# VibeBook Backend

A complete RESTful backend API for the VibeBook Album System built with Node.js, Express.js, Prisma ORM and PostgreSQL.

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Bcrypt
- Multer
- REST API

---

## Features

### Authentication
- User Register
- User Login
- Admin Login
- JWT Authentication

### Dashboard
- Dashboard Statistics
- Total Orders
- Total Users
- Total Albums
- Sales Summary

### Products
- Create Product
- Update Product
- Delete Product
- Product Image Upload

### Categories
- Full CRUD

### Covers
- Full CRUD

### Templates
- JSON Template Support
- Thumbnail Upload
- Full CRUD

### Album Editor
- Create Album
- Update Album
- Delete Album
- Album Pages
- Photos
- Text Layers
- Apply Template
- Apply Cover
- Autosave

### Orders
- List Orders
- Update Status
- Delete Order

### Settings
- Company Settings
- Social Media
- Logo

### Upload
- Image Upload API

---

## Installation

```bash
npm install
```

Create a `.env` file:

```env
DATABASE_URL=your_database_url
JWT_SECRET=your_secret_key
PORT=5000
```

Generate Prisma Client:

```bash
npx prisma generate
```

Run the server:

```bash
npm run dev
```

---

## API Documentation

See:

```
API_DOCUMENTATION.md
```

---

## Project Structure

```
src/
 ├── config/
 ├── controllers/
 ├── middleware/
 ├── routes/
 ├── server.js
 ├── app.js

prisma/
uploads/
```

---

## Author

Fatimə Məmmədova