import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { backendUrl } from '../utils/constants';
import Title from '../components/Title';

// Define interface for order item structure
interface OrderItem {
  productId: { _id: string; name: string; images?: string[] } | null;
  quantity: number;
  price: number;
  size: string;
  name: string;
}

// Define interface for order structure
interface Order {
  _id: string;
  userId: { _id: string; name: string; email: string } | null;
  items: OrderItem[];
  totalAmount: number;
  address: { street: string; city: string; state: string; zip: string; country: string; phoneNumber: string };
  paymentMethod: 'COD' | 'Stripe';
  payment: boolean;
  status: string;
  date: number;
}

// Define interface for pagination structure
interface Pagination {
  currentPage: number;
  totalPages: number;
  totalOrders: number;
  ordersPerPage: number;
}

// Define props interface for type safety
interface OrdersProps {
  token: string;
}

const Orders: React.FC<OrdersProps> = ({ token }) => {
  // State for orders, loading status, status updates, editing, pagination, and sorting
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState<{ [key: string]: string }>({});
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0,
    ordersPerPage: 10,
  });
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const navigate = useNavigate();

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

  // Fetch orders with pagination and sorting
  const fetchOrders = useCallback(
    async (page: number) => {
      setIsLoading(true);
      const csrfToken = await fetchCsrfToken();
      if (!csrfToken) {
        setIsLoading(false);
        return;
      }

      try {
        // Determine sort parameter based on sortOrder state
        const sortParam = sortOrder === 'newest' ? 'date-desc' : 'date-asc';
        // Make API call to fetch orders
        const response = await axios.post(
          `${backendUrl}/api/order/list`,
          { sort: sortParam },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-CSRF-Token': csrfToken,
              'Content-Type': 'application/json',
            },
            params: { page, limit: pagination.ordersPerPage },
            withCredentials: true,
          }
        );

        if (response.data.success) {
          setOrders(response.data.orders || []);
          setPagination(response.data.pagination || {
            currentPage: page,
            totalPages: Math.ceil(response.data.totalOrders / pagination.ordersPerPage),
            totalOrders: response.data.totalOrders || 0,
            ordersPerPage: pagination.ordersPerPage,
          });
        } else {
          toast.error(response.data.message || 'Failed to fetch orders');
        }
      } catch (error) {
        // Handle errors during order fetch
        if (axios.isAxiosError(error)) {
          toast.error(
            error.code === 'ERR_NETWORK'
              ? 'Cannot connect to the server. Please check if the backend is running and CORS is configured.'
              : error.response?.data.message || 'Error fetching orders'
          );
        } else {
          toast.error('An unexpected error occurred while fetching orders');
        }
      } finally {
        // Reset loading state
        setIsLoading(false);
      }
    },
    [token, fetchCsrfToken, pagination.ordersPerPage, sortOrder]
  );

  // Fetch orders on component mount or when token/sortOrder changes
  useEffect(() => {
    if (token) {
      fetchOrders(1);
    } else {
      toast.error('Please log in to view orders');
      navigate('/login');
    }
  }, [token, sortOrder, fetchOrders, navigate]);

  // Handle order status update
  const handleStatusUpdate = async (orderId: string) => {
    const newStatus = statusUpdates[orderId];
    if (!newStatus) {
      toast.error('Please select a status');
      return;
    }

    const csrfToken = await fetchCsrfToken();
    if (!csrfToken) return;

    try {
      // Make API call to update order status
      const response = await axios.post(
        `${backendUrl}/api/order/status`,
        { orderId, status: newStatus },
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
        fetchOrders(pagination.currentPage); // Refresh orders
        setStatusUpdates((prev) => ({ ...prev, [orderId]: '' }));
        setEditingOrderId(null);
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

  // Handle status input change for an order
  const handleStatusChange = (orderId: string, value: string) => {
    setStatusUpdates((prev) => ({ ...prev, [orderId]: value }));
  };

  // Toggle edit mode for status updates
  const toggleEdit = (orderId: string) => {
    setEditingOrderId(editingOrderId === orderId ? null : orderId);
  };

  // Handle sort order change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSortOrder = e.target.value as 'newest' | 'oldest';
    setSortOrder(newSortOrder);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  // Render pagination buttons
  const renderPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    const thresholdForEllipsis = 6;

    if (pagination.totalPages <= maxPagesToShow) {
      for (let i = 1; i <= pagination.totalPages; i++) {
        pages.push(
          <button
            key={i}
            onClick={() => fetchOrders(i)}
            className={`mx-1 px-3 py-1 rounded ${
              pagination.currentPage === i
                ? 'bg-gray-800 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {i}
          </button>
        );
      }
    } else {
      let startPage = Math.max(1, pagination.currentPage);
      let endPage = Math.min(startPage + maxPagesToShow - 1, pagination.totalPages);

      if (pagination.currentPage > pagination.totalPages - maxPagesToShow) {
        startPage = pagination.totalPages - maxPagesToShow + 1;
        endPage = pagination.totalPages;
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(
          <button
            key={i}
            onClick={() => fetchOrders(i)}
            className={`mx-1 px-3 py-1 rounded ${
              pagination.currentPage === i
                ? 'bg-gray-800 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {i}
          </button>
        );
      }

      if (pagination.totalPages > thresholdForEllipsis && endPage < pagination.totalPages) {
        pages.push(
          <span key="ellipsis" className="mx-1 px-3 py-1 text-gray-800">
            ...
          </span>
        );
        pages.push(
          <button
            key={pagination.totalPages}
            onClick={() => fetchOrders(pagination.totalPages)}
            className={`mx-1 px-3 py-1 rounded ${
              pagination.currentPage === pagination.totalPages
                ? 'bg-gray-800 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {pagination.totalPages}
          </button>
        );
      }
    }

    return pages;
  };

  return (
    // Main container for orders list
    <div className="border-t pt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Title and sorting controls */}
      <div className="flex justify-between items-center mb-8">
        <div className="text-2xl">
          <Title text1={'ALL'} text2={'ORDERS'} />
        </div>
        <div>
          <select
            value={sortOrder}
            onChange={handleSortChange}
            className="border p-2 rounded focus:outline-none focus:border-blue-500"
            aria-label="Sort orders"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>
      {isLoading ? (
        // Display loading spinner and message
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-800 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        // Display message if no orders are found
        <p className="text-gray-500 text-center py-12">No orders found.</p>
      ) : (
        <>
          {/* Orders list */}
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order._id}
                className="py-6 border-t border-b text-gray-700 bg-white shadow-sm rounded-lg flex flex-col md:flex-row md:items-start md:justify-between gap-6 p-6"
              >
                {/* Order items section */}
                <div className="flex flex-col gap-4 w-full md:w-2/3">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-start gap-6">
                      {item.productId && item.productId.images && item.productId.images[0] ? (
                        <>
                          <Link to={`/product/${item.productId._id}`} className="hover:opacity-80">
                            <img
                              src={item.productId.images[0]}
                              alt={item.name}
                              className="w-24 h-24 object-cover rounded-md"
                            />
                          </Link>
                          <div>
                            <Link to={`/product/${item.productId._id}`} className="hover:underline">
                              <p className="text-lg font-medium text-gray-800">{item.name}</p>
                            </Link>
                            <div className="flex items-center gap-4 mt-2 text-base text-gray-700">
                              <p>
                                {item.quantity} x ${item.price}
                              </p>
                              <p>Size: {item.size}</p>
                            </div>
                            <p className="mt-2 text-sm">
                              Date: <span className="text-gray-400">{new Date(order.date).toLocaleDateString()}</span>
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-24 h-24 flex items-center justify-center bg-gray-100 rounded-md">
                            <span className="text-gray-500 text-sm">No Image</span>
                          </div>
                          <div>
                            <p className="text-lg font-medium text-gray-800">
                              {item.name} {item.productId ? '' : '(Product Unavailable)'}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-base text-gray-700">
                              <p>
                                {item.quantity} x ${item.price}
                              </p>
                              <p>Size: {item.size}</p>
                            </div>
                            <p className="mt-2 text-sm">
                              Date: <span className="text-gray-400">{new Date(order.date).toLocaleDateString()}</span>
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                {/* Order details and status update section */}
                <div className="md:w-1/3 flex flex-col gap-2">
                  <p className="text-base font-medium">
                    User:{' '}
                    <span className="text-gray-600">
                      {order.userId ? `${order.userId.name} (${order.userId.email})` : 'Unknown User'}
                    </span>
                  </p>
                  <p className="text-base font-medium">
                    Status: <span className="text-gray-600">{order.status}</span>
                  </p>
                  {editingOrderId === order._id ? (
                    <div className="flex gap-2">
                      <select
                        value={statusUpdates[order._id] || ''}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
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
                        onClick={() => handleStatusUpdate(order._id)}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => toggleEdit(order._id)}
                        className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => toggleEdit(order._id)}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                      Edit Status
                    </button>
                  )}
                  <p className="text-base font-medium">
                    Payment: <span className="text-gray-600">{order.payment ? 'Paid' : 'Unpaid'}</span>
                  </p>
                  <p className="text-base font-medium">
                    Payment Method: <span className="text-gray-600">{order.paymentMethod}</span>
                  </p>
                  <p className="text-base font-medium">
                    Total: <span className="text-gray-600">${order.totalAmount}</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    Address: {order.address.street}, {order.address.city}, {order.address.state}, {order.address.zip},{' '}
                    {order.address.country}, Phone: {order.address.phoneNumber}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {/* Pagination controls */}
          <div className="mt-8 flex justify-center items-center gap-4">
            <button
              onClick={() => fetchOrders(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
            >
              Previous
            </button>
            {renderPageNumbers()}
            <button
              onClick={() => fetchOrders(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
            >
              Next
            </button>
          </div>
          <p className="mt-4 text-sm text-gray-500 text-center">
            Showing {orders.length} of {pagination.totalOrders} orders (Page {pagination.currentPage} of{' '}
            {pagination.totalPages})
          </p>
        </>
      )}
    </div>
  );
};

export default Orders;