import React, { useContext, useEffect, useState } from "react";
import { shopContext } from "../context/shopContext";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate, useSearchParams } from "react-router-dom";

const VerifyEmail: React.FC = () => {
  // Access backend URL and CSRF token from context
  const { backendUrl, csrfToken } = useContext(shopContext)!;
  // Get URL search parameters and navigation function
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // State for displaying verification message and error status
  const [message, setMessage] = useState("Verifying email...");
  const [isError, setIsError] = useState(false);

  // Handle email verification on component mount
  useEffect(() => {
    const verifyEmail = async () => {
      // Extract token from URL query parameters
      const token = searchParams.get("token");
      // Validate presence of verification token
      if (!token) {
        setMessage("Invalid or missing verification token");
        setIsError(true);
        toast.error("Invalid or missing verification token");
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      try {
        // Make API call to verify email
        const response = await axios.get(
          `${backendUrl}/api/auth/verify-email`,
          {
            params: { token },
            headers: {
              "X-CSRF-Token": csrfToken,
            },
            withCredentials: true,
          }
        );

        // Handle API response
        if (response.data.success) {
          setMessage("Email verified successfully");
          toast.success("Email verified successfully");
          setTimeout(() => navigate("/login"), 2000);
        } else {
          setMessage(response.data.message || "Failed to verify email");
          setIsError(true);
          toast.error(response.data.message || "Failed to verify email");
          setTimeout(() => navigate("/login"), 2000);
        }
      } catch (error: any) {
        // Handle errors (e.g., invalid/expired token, server issues)
        const message = error.response?.data?.message || "Server error";
        if (error.response?.status === 400) {
          setMessage("Invalid or expired token");
          setIsError(true);
          toast.error("Invalid or expired token");
        } else {
          setMessage(message);
          setIsError(true);
          toast.error(message);
        }
        setTimeout(() => navigate("/login"), 5000);
      }
    };

    // Trigger email verification
    verifyEmail();
  }, [backendUrl, csrfToken, navigate, searchParams]); // Dependencies for useEffect

  return (
    // Display verification status in a centered card
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div
        className="w-full max-w-md p-8 bg-white border rounded-lg shadow-md text-center"
        dir="rtl" // Right-to-left direction for Arabic support
      >
        {/* Display message with conditional styling based on error status */}
        <p className={`text-lg ${isError ? "text-red-500" : "text-green-500"}`}>
          {message}
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;