import React, { useContext, useState } from "react";
import { shopContext } from "../context/shopContext";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate, useSearchParams } from "react-router-dom";

// Define interface for password data to ensure type safety
interface PasswordData {
  password: string;
  confirmPassword: string;
}

const ResetPassword: React.FC = () => {
  // Access backend URL and CSRF token from context
  const { backendUrl, csrfToken } = useContext(shopContext)!;
  // Get search parameters and navigation function
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // State for password input fields
  const [passwordData, setPasswordData] = useState<PasswordData>({
    password: "",
    confirmPassword: "",
  });
  // State to manage loading status during API call
  const [loading, setLoading] = useState(false);
  // Extract token from URL query parameters
  const token = searchParams.get("token");

  // Validate password against security requirements
  const validatePassword = (password: string) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;
    return (
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers &&
      hasSpecialChar &&
      isLongEnough
    );
  };

  // Handle input changes for password fields
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle form submission for password reset
  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate presence of reset token
    if (!token) {
      toast.error("Invalid or missing reset token");
      navigate("/login");
      return;
    }

    // Ensure both password fields are filled
    if (!passwordData.password || !passwordData.confirmPassword) {
      toast.error("All password fields are required");
      return;
    }

    // Check if passwords match
    if (passwordData.password !== passwordData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Validate password strength
    if (!validatePassword(passwordData.password)) {
      toast.error(
        "Password must contain uppercase, lowercase, numbers, special characters, and be at least 8 characters long"
      );
      return;
    }

    setLoading(true);
    try {
      // Make API call to reset password
      const response = await axios.post(
        `${backendUrl}/api/auth/reset-password`,
        {
          token,
          password: passwordData.password,
          confirmPassword: passwordData.confirmPassword,
        },
        {
          headers: {
            "X-CSRF-Token": csrfToken,
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      // Handle successful password reset
      if (response.data.success) {
        toast.success("Password reset successfully");
        setPasswordData({ password: "", confirmPassword: "" });
        setTimeout(() => navigate("/login"), 2000);
      } else {
        toast.error(response.data.message || "Failed to reset password");
      }
    } catch (error: any) {
      // Handle API errors (e.g., invalid/expired token or server issues)
      const message = error.response?.data?.message || "Server error";
      if (error.response?.status === 400) {
        toast.error("Invalid or expired token");
      } else {
        toast.error(message);
      }
    } finally {
      // Reset loading state
      setLoading(false);
    }
  };

  return (
    // Main container for the reset password form
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form
        onSubmit={handleResetPassword}
        className="w-full max-w-md p-8 bg-white border rounded-lg shadow-md space-y-4"
        dir="rtl" // Right-to-left direction for Arabic support
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Reset Password</h2>
        {/* New Password Input */}
        <div>
          <label className="block text-gray-700 mb-2">New Password</label>
          <input
            type="password"
            name="password"
            value={passwordData.password}
            onChange={handlePasswordChange}
            placeholder="Enter new password"
            className="w-full p-2 border rounded focus:outline-none focus:border-orange-500"
            required
          />
        </div>
        {/* Confirm Password Input */}
        <div>
          <label className="block text-gray-700 mb-2">
            Confirm New Password
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={passwordData.confirmPassword}
            onChange={handlePasswordChange}
            placeholder="Confirm new password"
            className="w-full p-2 border rounded focus:outline-none focus:border-orange-500"
            required
          />
        </div>
        {/* Form Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-black text-white p-2 rounded ${
              loading ? "opacity-50 cursor-not-allowed" : "hover:bg-orange-500"
            } transition-colors`}
          >
            {loading ? "Loading..." : "Reset Password"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full bg-gray-500 text-white p-2 rounded hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResetPassword;