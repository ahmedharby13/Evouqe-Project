
# 🛍️ Evouqe E-Commerce Platform

Evouqe is a full-stack e-commerce platform built with a modern tech stack including **React**, **TypeScript**, **Express.js**, and **MongoDB**.  
It supports all major e-commerce operations such as product browsing, user authentication, shopping cart management, secure payment processing, and an advanced admin panel.

---

## 📑 Table of Contents

- [🛍️ Evouqe E-Commerce Platform](#️-evouqe-e-commerce-platform)
  - [📑 Table of Contents](#-table-of-contents)
  - [✨ Features](#-features)
  - [🏗️ Architecture](#️-architecture)
  - [🧰 Installation](#-installation)
    - [✅ Prerequisites](#-prerequisites)
    - [🔧 Setup](#-setup)
  - [▶️ Usage](#️-usage)
    - [🚀 Access](#-access)
    - [📡 Example API Requests](#-example-api-requests)
  - [📁 Project Structure](#-project-structure)
  - [📦 Dependencies](#-dependencies)
    - [🔧 Backend](#-backend)
    - [🎨 Frontend](#-frontend)
    - [⚙️ Admin](#️-admin)
  - [🛡️ Security Features](#️-security-features)
  - [🔐 Authentication System](#-authentication-system)
  - [🔑 Testing Credentials](#-testing-credentials)
  - [🤝 Contributing](#-contributing)
  - [📝 License](#-license)

---

## ✨ Features

- **User Authentication:** Email/password with verification, Google OAuth, and role-based admin access.
- **Product Management:** CRUD operations, Cloudinary image uploads, advanced filtering, and reviews.
- **Cart & Orders:** Persistent cart, Stripe payments, Cash on Delivery, order tracking, and inventory.
- **Admin Panel:** Dedicated app to manage products, users, and orders.
- **Multilingual Support:** Email and registration flows support multiple languages.

---

## 🏗️ Architecture

Evouqe follows a 3-tier architecture:

| Tier         | Stack                                           |
|--------------|-------------------------------------------------|
| **Frontend** | React + TypeScript + Vite (`localhost:5173`)    |
| **Admin**    | React + TypeScript + Vite (`localhost:4000`)    |
| **Backend**  | Express.js + TypeScript REST API (`localhost:300`) |
| **Database** | MongoDB with Mongoose                           |
| **External** | Stripe, Cloudinary, Google OAuth, Nodemailer    |

> 🔁 Frontend/Admin connect to backend via REST API with **CORS** and **JWT** + **CSRF protection**.

---

## 🧰 Installation

### ✅ Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Stripe, Cloudinary, Google OAuth, and email service credentials

### 🔧 Setup

```bash
git clone https://github.com/ahmedharby13/Evouqe-Project.git
cd Evouqe-Project
````

Install dependencies for each part:

```bash
cd Backend && npm install
cd ../Frontend && npm install
cd ../Admin && npm install
```

Create `.env` in `/Backend/`:

```env
PORT=300
MONGO_URI=<your-mongodb-uri>
JWT_SECRET=<your-jwt-secret>
STRIPE_SECRET_KEY=<your-stripe-secret-key>
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-cloud-key>
CLOUDINARY_API_SECRET=<your-cloud-secret>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
NODEMAILER_EMAIL=<your-email>
NODEMAILER_PASS=<your-app-password>
FRONTEND_URL_DEV=http://localhost:5173
ADMIN_PANEL_URL=http://localhost:4000
```

📄 See [`docs/env.md`](./docs/env.md) for details.

---

## ▶️ Usage

Start the apps in separate terminals:

```bash
cd Backend && npm run dev         # Start Backend (http://localhost:300)
cd Frontend && npm run dev        # Start Frontend (http://localhost:5173)
cd Admin && npm run dev           # Start Admin Panel (http://localhost:4000)
```

### 🚀 Access

* 🛍️ Customer App: [http://localhost:5173](http://localhost:5173)
* ⚙️ Admin Panel: [http://localhost:4000](http://localhost:4000)
* 🔗 API: [http://localhost:300/api](http://localhost:300/api)

---

### 📡 Example API Requests

```bash
# Register a user
curl -X POST http://localhost:300/api/auth/register \
-d '{"email":"user@example.com","password":"StrongPass123!"}'

# Add a product (admin only)
curl -X POST http://localhost:300/api/product \
-H "Authorization: Bearer <jwt-token>" \
-d '{"name":"Product Name","price":100,"category":"Clothing"}'

# Get user cart
curl -X GET http://localhost:300/api/cart \
-H "Authorization: Bearer <jwt-token>" \
-H "CSRF-Token: <csrf-token>"
```

---

## 📁 Project Structure

```bash
Evouqe-Project/
├── Backend/                # Express.js API server (port 3000)
│   ├── controllers/        # Route handlers
│   │   ├── userController.ts  # User authentication and management
│   │   ├── productController.ts # Product management
│   │   ├── orderController.ts  # Order processing
│   │   └── verifyEmail.ts      # Email verification utilities
│   ├── models/            # Mongoose models
│   │   ├── userModel.ts   # User schema
│   │   ├── productModel.ts # Product schema with reviews and ratings
│   │   └── orderModel.ts  # Order schema
│   ├── routes/            # API routes
│   │   ├── userRoute.ts   # Authentication and user management
│   │   ├── productRoute.ts # Product CRUD and reviews
│   │   ├── cartRoute.ts   # Cart operations
│   │   ├── orderRoute.ts  # Order processing
│   │   └── googleAuth.ts  # Google OAuth routes
│   ├── middleware/        # Security middleware
│   │   ├── csrfProtection.ts # CSRF protection
│   │   ├── userAuth.ts    # JWT user authentication
│   │   ├── adminAuth.ts   # JWT admin authentication
│   │   ├── rateLimiter.ts # Rate limiting
│   │   └── verifyEmail.ts # Email verification middleware
│   ├── utils/             # Utilities
│   │   ├── logger.ts      # Logging with Winston
│   │   └── nodemailer.ts  # Email sending with Nodemailer
│   ├── config/            # Configuration
│   │   ├── mongoDB.ts     # MongoDB connection
│   │   └── cloudinary.ts  # Cloudinary setup
│   ├── validations/       # Input validation
│   │   └── userValidation.ts # User input validation
│   ├── server.ts          # Main server file
│   └── package.json       # Backend dependencies
├── Frontend/              # Customer-facing React app (port 5173)
│   ├── src/               # React source code
│   │   ├── pages/         # Pages (e.g., Product.tsx, Navbar.tsx)
│   │   ├── components/    # Reusable components
│   │   ├── context/       # State management
│   │   ├── assets/        # Static assets
│   │   └── App.tsx        # Main app component
│   ├── index.html         # HTML entry point
│   ├── tailwind.config.js # Tailwind CSS configuration
│   └── package.json       # Frontend dependencies
├── Admin/                 # Admin panel React app (port 4000)
│   ├── src/               # Admin source code
│   │   ├── pages/         # Admin pages
│   │   ├── components/    # Admin components
│   │   ├── utils/         # Admin utilities
│   │   └── App.tsx        # Admin app component
│   ├── index.html         # HTML entry point
│   ├── vite.config.ts     # Vite configuration with proxy
│   └── package.json       # Admin dependencies
├── docs/                  # Documentation files
│   ├── env.md             # Environment variables
│   └── testing-credentials.md # Testing credentials
├── README.md              # Main project documentation
└── LICENSE                # License file (to be added)
```

---

## 📦 Dependencies

### 🔧 Backend

* Core: `express`, `mongoose`, `typescript`, `ts-node`
* Auth: `jsonwebtoken`, `passport`, `bcryptjs`, `google-oauth`
* Security: `csurf`, `rate-limit`, `express-validator`
* Cloud: `stripe`, `cloudinary`, `nodemailer`, `multer`
* Others: `dotenv`, `winston`, `validator`

### 🎨 Frontend

* Core: `react`, `vite`, `react-router-dom`
* Styling: `tailwindcss`
* API & State: `axios`, `js-cookie`, `react-cookie`, `tinybase`
* UI: `react-toastify`

### ⚙️ Admin

* Similar to frontend but includes admin tools and Vite proxy config

---

## 🛡️ Security Features

* ✅ CSRF Protection (`csurf`)
* 🔒 JWT Authentication
* 🚫 Rate Limiting
* 🔐 Password Strength Validation (`zxcvbn`)
* 🧼 Input Sanitization (`express-validator`)
* 🍪 Secure Sessions with cookies

---

## 🔐 Authentication System

* Email/Password Registration (with verification)
* Google OAuth Integration
* Password Reset via Email Token
* Admin Roles with JWT
* Role-based Authorization

📄 See: [`userRoute.ts`](./Backend/routes/userRoute.ts)

---

## 🔑 Testing Credentials

| Role  | Email                                                     | Password        |
| ----- | --------------------------------------------------------- | --------------- |
| Admin | [ahmedharby138@gmail.com](mailto:ahmedharby138@gmail.com) | password123     |
| User  | [powoc26388@hedotu.com](mailto:powoc26388@hedotu.com)     | NewPassword123! |

📄 See: [`docs/testing-credentials.md`](./docs/testing-credentials.md)

---

## 🤝 Contributing

1. Fork the repository:
   [https://github.com/ahmedharby13/Evouqe-Project](https://github.com/ahmedharby13/Evouqe-Project)
2. Create your feature branch:

   ```bash
   git checkout -b feature-branch
   ```
3. Commit and push:

   ```bash
   git commit -m "Add feature"
   git push origin feature-branch
   ```
4. Open a pull request 🚀

---

## 📝 License

This project is licensed under the [MIT License](./LICENSE).

---

> Made by [@ahmedharby13](https://github.com/ahmedharby13)

