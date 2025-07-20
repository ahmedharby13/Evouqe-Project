import React, { useContext, useState } from "react";
import { shopContext } from "../context/shopContext";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";

// Define interface for registration form data
interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Register component for user account creation
const Register: React.FC = () => {
  const { backendUrl, csrfToken } = useContext(shopContext)!;
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegisterData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  // Handle form input changes
  const onChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Validate password complexity
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

  // Handle form submission for registration
  const onSubmitHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      toast.error("All fields are required");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!validatePassword(formData.password)) {
      toast.error(
        "Password must contain uppercase, lowercase, numbers, special characters, and be at least 8 characters long"
      );
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        `${backendUrl}/api/user/register`,
        formData,
        {
          headers: { "X-CSRF-Token": csrfToken },
          withCredentials: true,
        }
      );
      if (response.data.success) {
        toast.success(
          "Registration successful. Check your email for activation."
        );
        navigate("/login");
      } else {
        toast.error(response.data.message || "Registration failed");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Server error");
    } finally {
      setLoading(false);
    }
  };

  // Redirect to Google OAuth registration
  const handleGoogleRegister = () => {
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form
        onSubmit={onSubmitHandler}
        className="w-full max-w-md p-8 bg-white border rounded-lg shadow-md"
        dir="rtl"
      >
        <h2 className="text-2xl mb-6 font-bold text-center">Create Account</h2>
        {/* Name Input */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={onChangeHandler}
            placeholder="Enter your name"
            className="w-full p-2 border rounded focus:outline-none focus:border-orange-500"
            required
          />
        </div>
        {/* Email Input */}
        <div className="mb-4">
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
        {/* Password Input */}
        <div className="mb-4">
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
        {/* Confirm Password Input */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={onChangeHandler}
            placeholder="Confirm your password"
            className="w-full p-2 border rounded focus:outline-none focus:border-orange-500"
            required
          />
        </div>
        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-black text-white p-2 rounded ${
            loading ? "opacity-50 cursor-not-allowed" : "hover:bg-orange-500"
          } transition-colors`}
        >
          {loading ? "Loading..." : "Create Account"}
        </button>
        {/* Google Registration Button */}
        <button
          type="button"
          onClick={handleGoogleRegister}
          className="w-full mt-4 bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
        >
          Register with Google
        </button>
        {/* Login Link */}
        <p className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-500 hover:underline">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;