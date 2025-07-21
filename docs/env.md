# Environment Variables

To run the **Evouqe-Project**, create a `.env` file in the `Backend/` directory with the following environment variables. Ensure all required variables are set to avoid runtime errors.

## Required Environment Variables
| Variable                   | Description                                                                 | Example Value                              | Status        |
|----------------------------|-----------------------------------------------------------------------------|--------------------------------------------|---------------|
| `PORT`                    | Backend server port                                                        | `3000`                                      | Optional (default: 300) |
| `MONGODB_URI`             | MongoDB connection string (e.g., MongoDB Atlas or local instance)          | `mongodb+srv://<user>:<pass>@cluster0.mongodb.net/evouqe?retryWrites=true&w=majority` | **Required** (incomplete) |
| `JWT_SECRET_KEY`          | Secret key for JWT access tokens (should be long and random)               | `<random-secure-string>`                   | **Required** (short, improve security) |
| `JWT_REFRESH_SECRET_KEY`  | Secret key for JWT refresh tokens (should be long and random)              | `<random-secure-string>`                   | **Required** (short, improve security) |
| `JWT_EXPIRES_IN`          | Expiration time for JWT access tokens                                      | `12h`                                      | Optional (default: 12h) |
| `JWT_REFRESH_EXPIRES_IN`  | Expiration time for JWT refresh tokens                                     | `15m`                                      | Optional (default: 15m) |
| `APP_URL`                 | Base URL for the application (production)                                  | `https://evouqe.example.com`               | **Required** (incomplete) |
| `FRONTEND_URL_DEV`        | Frontend URL for development                                               | `http://localhost:5173`                    | **Required** (incomplete) |
| `FRONTEND_URL_PROD`       | Frontend URL for production (optional)                                     | `https://frontend.evouqe.example.com`      | Optional (commented out) |
| `FRONTEND_URL`            | General frontend URL (used in some API calls)                              | `http://localhost:5173`                    | **Required** (incomplete) |
| `ADMIN_PANEL_URL`         | Admin panel URL for CORS and proxy configuration                           | `http://localhost:4000`                    | **Required** (missing) |
| `ADMIN_EMAIL`             | Admin email for default admin account                                      | `ahmedharby138@gmail.com`                  | **Required** (incomplete) |
| `ADMIN_PASSWORD`          | Admin password for default admin account                                   | `password123`                              | **Required** (incomplete) |
| `CLOUDINARY_CLOUD_NAME`   | Cloudinary cloud name for image uploads                                    | `dp4<your-cloud-name>`                    | **Required** (incomplete) |
| `CLOUDINARY_API_KEY`      | Cloudinary API key for image uploads                                       | `285953823<your-api-key>`                  | **Required** |
| `CLOUDINARY_API_SECRET`   | Cloudinary API secret for image uploads                                    | `ZPsr_KSBBB7MNCGY<your-api-secret>`       | **Required** |
| `STRIPE_SECRET_KEY`       | Stripe secret key for payment processing                                   | `sk_test_51R2ueKIN56gHfE8I<your-key>`      | **Required** (incomplete) |
| `GOOGLE_CLIENT_ID`        | Google OAuth client ID for authentication                                  | `1083757852261-jdl7<your-client-id>.apps.googleusercontent.com` | **Required** (incomplete) |
| `GOOGLE_CLIENT_SECRET`    | Google OAuth client secret for authentication                              | `<your-client-secret>`                     | **Required** (missing) |
| `GOOGLE_CALLBACK_URL`     | Google OAuth callback URL                                                  | `http://localhost:3000/api/auth/google/callback` | **Required** |
| `EMAIL_USER`              | Email address for Nodemailer (e.g., Gmail)                                 | `your-email@gmail.com`                     | **Required** (missing) |
| `EMAIL_PASS`              | Email app password for Nodemailer (not regular password)                   | `<your-app-password>`                      | **Required** (incomplete) |

## Notes
- **Security**: Ensure `JWT_SECRET_KEY` and `JWT_REFRESH_SECRET_KEY` are long, random strings (e.g., generated using `crypto.randomBytes(32).toString('hex')`) for better security.
- **MongoDB**: Replace `<user>` and `<pass>` in `MONGODB_URI` with your MongoDB credentials. The provided URI appears incomplete (`...jtqmw85.mongodb.net/...mmerceWebsite`).
- **Cloudinary**: Obtain `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` from your Cloudinary dashboard.
- **Stripe**: Get the full `STRIPE_SECRET_KEY` from your Stripe dashboard (test or live mode).
- **Google OAuth**: Obtain `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from Google Cloud Console. Ensure the callback URL matches your backend route.
- **Nodemailer**: Use an app-specific password for `EMAIL_PASS` if using Gmail. Regular passwords may not work due to security settings.
- **CORS**: Ensure `FRONTEND_URL_DEV` and `ADMIN_PANEL_URL` match the ports used in development (`5173` for Frontend, `4000` for Admin).
- **Production**: Uncomment and set `FRONTEND_URL_PROD` for production deployment.
- **Sensitive Data**: Never commit the `.env` file to GitHub. Ensure it’s included in `.gitignore`.

## Setup Instructions
1. Create a `.env` file in the `Backend/` directory.
2. Copy the above variables and replace placeholders with actual values.
3. Test the configuration by running the backend (`cd Backend && npm run dev`).

For more details, see [README.md](../README.md) in the project root.