import React, { useContext, useEffect } from "react";
import { shopContext } from "../context/shopContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useCookies } from "react-cookie";
import { toast } from "react-toastify";

const Success: React.FC = () => {
  // Initialize cookie setter for accessToken, refreshToken, and userId
  const [, setCookie] = useCookies(["accessToken", "refreshToken", "userId"]);
  // Access context functions for setting token and merging cart
  const { setToken, mergeCart } = useContext(shopContext)!;
  // Navigation and location hooks for routing and URL parameters
  const navigate = useNavigate();
  const location = useLocation();

  // Handle Google login success logic on component mount
  useEffect(() => {
    // Parse URL query parameters
    const params = new URLSearchParams(location.search);
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");

    // Check if both tokens are present
    if (accessToken && refreshToken) {
      // Set access token in context
      setToken(accessToken);
      // Store tokens in cookies with root path
      setCookie("accessToken", accessToken, { path: "/" });
      setCookie("refreshToken", refreshToken, { path: "/" });

      // Merge cart data (e.g., sync local cart with server)
      mergeCart();
      // Notify user of successful login
      toast.success("Google login successful");
      // Redirect to homepage
      navigate("/");
    } else {
      // Handle missing tokens by showing error and redirecting to login
      toast.error("Google login failed: Missing tokens");
      navigate("/login");
    }
  }, [setToken, setCookie, mergeCart, navigate, location.search]); // Dependencies for useEffect

  return (
    // Display a loading message while processing Google login
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <p>Processing Google login...</p>
    </div>
  );
};

export default Success;