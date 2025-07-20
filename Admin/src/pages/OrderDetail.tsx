import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import axios from 'axios';
import { toast } from 'react-toastify';
import { backendUrl, currency } from '../utils/constants';

// Define interface for order item structure
interface OrderItem {
  productId: { _id: string; name: string; images?: string[] };
  quantity: number;
  price: number;
  size: string;
}

// Define interface for order structure
interface Order {
  _id: string;
  userId: { _id: string; name: string; email: string };
  items: OrderItem[];
  totalAmount: number;
  address: { street: string; city: string; state: string; zip: string; country: string };
  paymentMethod: 'COD' | 'Stripe';
  payment: boolean;
  status: string;
  date: number;
}

// Define props interface for type safety
interface OrderDetailProps {
  token: string;
}

const OrderDetail: React.FC<OrderDetailProps> = ({ token }) => {
  // Extract orderId from URL params and initialize navigation
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  // State for order data, loading status, and order status
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');

  // Fetch CSRF token for secure API calls
  const fetchCsrfToken = useCallback(async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/csrf-token`, { withCredentials: true });
      return response.data.csrfToken || '';
    } catch (error) {
      // Handle errors during CSRF token fetch
      if (axios.isAxiosError(error)) {
        toast.error(
          error.code === 'ERR_NETWORK'
            ? 'Cannot connect to the server. Please check if the backend is running and CORS is configured.'
            : error.response?.data.message || 'Error fetching CSRF token'
        );
      } else {
        toast.error('An unexpected error occurred while fetching CSRF token');
      }
      return '';
    }
  }, []);

  // Fetch order details from the server
  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setIsLoading(true);
    try {
      // Make API call to fetch order details
      const response = await axios.get(`${backendUrl}/api/order/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      if (response.data.success && response.data.orders.length > 0) {
        setOrder(response.data.orders[0]);
        setStatus(response.data.orders[0].status);
      } else {
        toast.error(response.data.message || 'Order not found');
        navigate('/orders');
      }
    } catch (error) {
      // Handle errors during order fetch
      if (axios.isAxiosError(error)) {
        toast.error(
          error.code === 'ERR_NETWORK'
            ? 'Cannot connect to the server. Please check if the backend is running and CORS is configured.'
            : error.response?.data.message || 'Error fetching order'
        );
      } else {
        toast.error('An unexpected error occurred while fetching order');
      }
      navigate('/orders');
    } finally {
      // Reset loading state
      setIsLoading(false);
    }
  }, [orderId, token, navigate]);

  // Handle order status update
  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate status selection
    if (!status) {
      toast.error('Please select a status');
      return;
    }
    const csrfToken = await fetchCsrfToken();
    if (!csrfToken) return;

    try {
      // Make API call to update order status
      const response = await axios.post(
        `${backendUrl}/api/order/status`,
        { orderId, status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-CSRF-Token': csrfToken,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );
      if (response.data.success) {
        toast.success('Order status updated');
        fetchOrder(); // Refresh order details
      } else {
        toast.error(response.data.message || 'Failed to update status');
      }
    } catch (error) {
      // Handle errors during status update
      if (axios.isAxiosError(error)) {
        toast.error(
          error.code === 'ERR_NETWORK'
            ? 'Cannot connect to the server. Please check if the backend is running and CORS is configured.'
            : error.response?.data.message || 'Error updating status'
        );
      } else {
        toast.error('An unexpected error occurred while updating status');
      }
    }
  };

  // Fetch order details on component mount if token and orderId are present
  useEffect(() => {
    if (token && orderId) {
      fetchOrder();
    } else {
      toast.error('Please log in to view order details');
      navigate('/orders');
    }
  }, [token, orderId, fetchOrder, navigate]);

  return (
    // Main container for order details
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Order Details</h1>
      {isLoading ? (
        // Display loading spinner and message
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-800 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading order...</p>
        </div>
      ) : !order ? (
        // Display message if order is not found
        <p className="text-gray-500 text-center py-12">Order not found.</p>
      ) : (
        // Display order details
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Order Information Section */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Order Information</h2>
              <p><strong>User:</strong> {order.userId.name} ({order.userId.email})</p>
              <p><strong>Date:</strong> {new Date(order.date).toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> {currency}{order.totalAmount}</p>
              <p><strong>Payment:</strong> {order.payment ? 'Paid' : 'Unpaid'}</p>
              <p><strong>Payment Method:</strong> {order.paymentMethod}</p>
              <p><strong>Address:</strong> {order.address.street}, {order.address.city}, {order.address.state}, {order.address.zip}, {order.address.country}</p>
            </div>
            {/* Order Items Section */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Items</h2>
              {order.items.map((item, index) => (
                <div key={index} className="flex items-start gap-4 mb-4">
                  <img
                    src={item.productId.images && item.productId.images[0] ? item.productId.images[0] : 'https://via.placeholder.com/100'}
                    alt={item.productId.name}
                    className="w-16 h-16 object-cover rounded"
                    onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/100')}
                  />
                  <div>
                    <p className="font-medium">{item.productId.name}</p>
                    <p>Quantity: {item.quantity}</p>
                    <p>Price: {currency}{item.price}</p>
                    <p>Size: {item.size}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Status Update Form */}
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-4">Update Status</h2>
            <form onSubmit={handleStatusUpdate} className="flex gap-4 items-center">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="border p-2 rounded focus:outline-none focus:border-blue-500"
                aria-label="Order status"
              >
                <option value="">Select Status</option>
                <option value="Order Placed">Order Placed</option>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Update Status
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;