import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router';
import { backendUrl } from '../utils/constants';

// Define props interface for type safety
interface LoginProps {
  setToken: (token: { accessToken: string; refreshToken: string }) => void;
}

// Define form data structure
interface FormData {
  email: string;
  password: string;
}

// Define API response structure
interface ApiResponse {
  success: boolean;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
}

const Login: React.FC<LoginProps> = ({ setToken }) => {
  // State for form inputs, password visibility, loading status, and CSRF token
  const [formData, setFormData] = useState<FormData>({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string>('');
  const navigate = useNavigate();

  // Fetch CSRF token on component mount
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        // Make API call to fetch CSRF token
        const response = await axios.get<{
          message: string; success: boolean; csrfToken: string 
        }>(
          `${backendUrl}/api/csrf-token`,
          { withCredentials: true }
        );
        if (response.data.success) {
          setCsrfToken(response.data.csrfToken);
        } else {
          throw new Error(response.data.message || 'Failed to fetch CSRF token');
        }
      } catch (error) {
        // Handle errors during CSRF token fetch
        const message = axios.isAxiosError(error)
          ? error.code === 'ERR_NETWORK'
            ? 'Cannot connect to the server. Please check your network.'
            : error.response?.data.message || 'Error fetching CSRF token'
          : 'An unexpected error occurred';
        toast.error(message);
      }
    };
    fetchCsrfToken();
  }, []); // Empty dependency array to run once on mount

  // Handle form submission for admin login
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Prevent submission if already loading or CSRF token is missing
    if (isLoading) return;
    if (!csrfToken) {
      toast.error('CSRF token missing. Please refresh and try again.');
      return;
    }

    // Client-side validation for email and password
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      // Make API call to authenticate admin
      const response = await axios.post<ApiResponse>(
        `${backendUrl}/api/user/admin`,
        { email: formData.email, password: formData.password },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          withCredentials: true,
        }
      );

      // Handle successful login
      if (response.data.success && response.data.accessToken && response.data.refreshToken) {
        setToken({
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
        });
        setFormData({ email: '', password: '' });
        toast.success('Admin login successful!');
        navigate('/admin/dashboard');
      } else {
        toast.error(response.data.message || 'Login failed');
      }
    } catch (error) {
      // Handle login errors (e.g., invalid credentials, network issues)
      const message = axios.isAxiosError(error)
        ? error.code === 'ERR_NETWORK'
          ? 'Cannot connect to the server. Please check your network.'
          : error.response?.data.message || 'Invalid credentials'
        : 'An unexpected error occurred';
      toast.error(message);
    } finally {
      // Reset loading state
      setIsLoading(false);
    }
  };

  return (
    // Main container for the login form
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg px-8 py-6 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-4">EVOQUE Admin</h1>
        <h2 className="text-2xl font-semibold text-center mb-6">Admin Login</h2>
        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email input field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              type="email"
              placeholder="Enter your email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value.trim() })}
              disabled={isLoading}
            />
          </div>
          {/* Password input field with show/hide toggle */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-600 hover:text-gray-800"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          {/* Submit button */}
          <button
            className={`w-full py-2 px-4 rounded-md text-white font-medium ${
              isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            } transition-colors duration-200`}
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;