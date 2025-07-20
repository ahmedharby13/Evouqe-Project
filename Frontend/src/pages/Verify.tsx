import React, { useContext, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { shopContext } from "../context/shopContext";
import axios from "axios";
import { toast } from "react-toastify";
import { useCookies } from "react-cookie";

const Verify: React.FC = () => {
  // Initialize navigation and context hooks
  const navigate = useNavigate();
  const { backendUrl, token, csrfToken, fetchCsrfToken } =
    useContext(shopContext)!;
  // Get URL search parameters and cookies
  const [searchParams] = useSearchParams();
  const [cookies] = useCookies(["accessToken", "refreshToken", "userId"]);
  // Extract orderId and sessionId from URL query parameters
  const orderId = searchParams.get("orderId");
  const sessionId = searchParams.get("sessionId");

  // Function to verify Stripe payment
  const verifyStripe = async () => {
    try {
      // Check if user is authenticated
      if (!token) {
        toast.error("Please login to verify payment");
        navigate("/login");
        return;
      }

      // Validate presence of required data
      const userId = cookies.userId;
      if (!userId || !sessionId || !orderId) {
        toast.error("Missing required data for payment verification");
        navigate("/cart");
        return;
      }

      // Ensure CSRF token is available, fetch if necessary
      let currentCsrfToken = csrfToken;
      if (!currentCsrfToken) {
        const fetchedToken = await fetchCsrfToken();
        currentCsrfToken = fetchedToken ?? null;
        if (!currentCsrfToken) {
          toast.error("Failed to fetch CSRF token");
          navigate("/cart");
          return;
        }
      }

      // Make API call to verify Stripe payment
      const response = await axios.post(
        `${backendUrl}/api/order/verifyStripe`,
        { orderId, sessionId, userId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-CSRF-Token": currentCsrfToken,
          },
          withCredentials: true,
        }
      );

      // Handle API response
      if (response.data.success) {
        toast.success(response.data.message);
        navigate("/orders");
      } else {
        toast.error(response.data.message || "Error verifying Stripe payment");
        navigate("/cart");
      }
    } catch (error: any) {
      // Handle errors during verification (e.g., network issues, server errors)
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Error verifying Stripe payment"
      );
      navigate("/cart");
    }
  };

  // Trigger verification when orderId and sessionId are present
  useEffect(() => {
    if (orderId && sessionId) {
      verifyStripe();
    } else {
      // Redirect to cart if required parameters are missing
      toast.error("Invalid order ID or session ID");
      navigate("/cart");
    }
  }, [orderId, sessionId]); // Dependencies for useEffect

  // Display a simple processing message during verification
  return <div className="text-center text-gray-500">Processing...</div>;
};

export default Verify;