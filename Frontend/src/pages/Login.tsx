import React, { useContext, useState } from "react";
import { shopContext } from "../context/shopContext";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";
import { useCookies } from "react-cookie";

// Define login form data interface
interface LoginData {
  email: string;
  password: string;
}

// Login component for user authentication
const Login: React.FC = () => {
  const [, setCookie] = useCookies(["accessToken", "refreshToken", "userId"]);
  const context = useContext(shopContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginData>({
    email: "",
    password: "",
  });
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Check if context is available
  if (!context) {
    return <div>Error: Shop context not available</div>;
  }

  const { backendUrl, setToken, csrfToken, mergeCart } = context;

  // Handle form input changes
  const onChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle login form submission
  const onSubmitHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error("Email and password are required");
      return;
    }
    if (!csrfToken) {
      toast.error("CSRF token not available, please try again");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        `${backendUrl}/api/user/login`,
        formData,
        {
          headers: { "X-CSRF-Token": csrfToken },
          withCredentials: true,
        }
      );
      if (response.data.success) {
        const { accessToken, refreshToken, userId } = response.data;
        // Store tokens in cookies with secure settings
        setCookie("accessToken", accessToken, { 
          path: "/", 
          secure: process.env.NODE_ENV === 'production', 
          sameSite: 'strict' 
        });
        setCookie("refreshToken", refreshToken, { 
          path: "/", 
          secure: process.env.NODE_ENV === 'production', 
          sameSite: 'strict' 
        });
        setCookie("userId", userId, { 
          path: "/", 
          secure: process.env.NODE_ENV === 'production', 
          sameSite: 'strict' 
        });
        // Store access token in localStorage for context
        localStorage.setItem('accessToken', accessToken);
        
        // Update context with token
        setToken(accessToken);
        
        // Ensure state update before merging cart
        await new Promise(resolve => setTimeout(resolve, 0));
        
        // Merge local cart with backend
        await mergeCart();
        
        toast.success("Login successful");
        navigate("/");
      } else {
        toast.error(response.data.message || "Login failed");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Server error");
    } finally {
      setLoading(false);
    }
  };

  // Handle forgot password form submission
  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!forgotPasswordEmail) {
      toast.error("Email is required");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        `${backendUrl}/api/auth/forgot-password`,
        { email: forgotPasswordEmail },
        {
          headers: {
            "X-CSRF-Token": csrfToken,
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );
      if (response.data.success) {
        toast.success("Password reset link sent to your email");
        setForgotPasswordEmail("");
        setShowForgotPassword(false);
      } else {
        toast.error(
          response.data.message || "Failed to send password reset link"
        );
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Server error";
      if (error.response?.status === 404) {
        toast.error("User not found");
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Redirect to Google OAuth login
  const handleGoogleLogin = () => {
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div
        className="w-full max-w-md p-8 bg-white border rounded-lg shadow-md"
        dir="rtl"
      >
        {showForgotPassword ? (
          // Forgot Password Form
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <h2 className="text-2xl font-bold mb-6 text-center">
              Forgot Password
            </h2>
            <div>
              <label className="block text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full p-2 border rounded focus:outline-none focus:border-orange-500"
                required
              />
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-black text-white p-2 rounded ${
                  loading
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-orange-500"
                } transition-colors`}
              >
                {loading ? "Loading..." : "Send Reset Link"}
              </button>
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="w-full bg-gray-500 text-white p-2 rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          // Login Form
          <form onSubmit={onSubmitHandler} className="space-y-4">
            <h2 className="text-2xl mb-6 font-bold text-center">Login</h2>
            <div>
              <label className="block text-gray-700 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={onChangeHandler}
                placeholder="Enter your email"
                className="w-full p-2 border rounded focus:outline-none focus:border-orange-500"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={onChangeHandler}
                placeholder="Enter your password"
                className="w-full p-2 border rounded focus:outline-none focus:border-orange-500"
                required
              />
            </div>
            <div className="mb-4 text-left">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-blue-500 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-black text-white p-2 rounded ${
                loading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-orange-500"
              } transition-colors`}
            >
              {loading ? "Loading..." : "Login"}
            </button>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full mt-4 bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
            >
              Login with Google
            </button>
            <p className="mt-4 text-center text-sm">
              Don't have an account?{" "}
              <Link to="/register" className="text-blue-500 hover:underline">
                Create Account
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;