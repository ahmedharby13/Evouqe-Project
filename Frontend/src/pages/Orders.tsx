import React, { useContext, useEffect, useState } from 'react';
import { shopContext } from '../context/shopContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useCookies } from 'react-cookie';
import { Link } from 'react-router-dom';
import Title from '../components/Title';

// Define interfaces for order items and orders
interface OrderItem {
  _id: string;
  productId: { _id: string; name: string; images: string[] };
  name: string;
  quantity: number;
  price: number;
  size: string;
}

interface Order {
  _id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phoneNumber: string;
    _id: string;
  };
  paymentMethod: 'COD' | 'Stripe';
  payment: boolean;
  status: string;
  date: number;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalOrders: number;
  ordersPerPage: number;
}

// Orders component to display user's order history
const Orders: React.FC = () => {
  const { backendUrl, token, csrfToken, fetchCsrfToken, isAuthenticated } = useContext(shopContext)!;
  const [cookies] = useCookies(['accessToken', 'userId']);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0,
    ordersPerPage: 10,
  });
  const [loading, setLoading] = useState(false);

  // Fetch user's orders from backend
  const fetchUserOrders = async (page: number) => {
    setLoading(true);
    try {
      if (!isAuthenticated || !token) {
        toast.error('Please login to view orders');
        return;
      }

      const userId = cookies.userId;
      if (!userId) {
        toast.error('User ID not found');
        return;
      }

      let currentCsrfToken = csrfToken;
      if (!currentCsrfToken) {
        const fetchedToken = await fetchCsrfToken();
        currentCsrfToken = fetchedToken ?? null;
        if (!currentCsrfToken) {
          toast.error('Failed to fetch CSRF token');
          return;
        }
      }

      const response = await axios.post(
        `${backendUrl}/api/order/userorders`,
        { userId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-CSRF-Token': currentCsrfToken,
          },
          params: { page, limit: pagination.ordersPerPage },
          withCredentials: true,
        }
      );

      if (response.data.success) {
        setOrders(response.data.orders);
        setPagination(response.data.pagination);
      } else {
        toast.error(response.data.message || 'Failed to fetch orders');
      }
    } catch (error: any) {
      toast.error('An error occurred while fetching orders');
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders on component mount if authenticated
  useEffect(() => {
    if (isAuthenticated && token && cookies.userId) {
      fetchUserOrders(1);
    }
  }, [token, csrfToken, cookies.userId, isAuthenticated]);

  // Handle pagination page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchUserOrders(newPage);
    }
  };

  // Render pagination page numbers
  const renderPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    const startPage = Math.max(1, pagination.currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(pagination.totalPages, startPage + maxPagesToShow - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
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

    return pages;
  };

  return (
    <div className="border-t pt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Page Title */}
      <div className="text-2xl mb-8">
        <Title text1={'MY'} text2={'ORDERS'} />
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-800 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No orders found.</p>
      ) : (
        <>
          {/* Orders List */}
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order._id}
                className="py-6 border-t border-b text-gray-700 bg-white shadow-sm rounded-lg flex flex-col md:flex-row md:items-start md:justify-between gap-6 p-6"
              >
                <div className="flex flex-col gap-4 w-full md:w-2/3">
                  {order.items.map((item) => (
                    // Handle missing productId gracefully
                    item.productId ? (
                      <div key={item._id} className="flex items-start gap-6">
                        <Link to={`/product/${item.productId._id}`} className="hover:opacity-80">
                          <img
                            src={item.productId.images[0] || 'https://via.placeholder.com/100'}
                            alt={item.name}
                            className="w-24 h-24 object-cover rounded-md"
                            onError={(e) => {
                              e.currentTarget.src = 'https://via.placeholder.com/100';
                            }}
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
                      </div>
                    ) : (
                      <div key={item._id} className="flex items-start gap-6">
                        <img
                          src="https://via.placeholder.com/100"
                          alt="Product Unavailable"
                          className="w-24 h-24 object-cover rounded-md"
                        />
                        <div>
                          <p className="text-lg font-medium text-gray-800">{item.name} (Product Unavailable)</p>
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
                      </div>
                    )
                  ))}
                </div>
                {/* Order Details */}
                <div className="md:w-1/3 flex flex-col gap-2">
                  <p className="text-base font-medium">Status: <span className="text-gray-600">{order.status}</span></p>
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

          {/* Pagination Controls */}
          <div className="mt-8 flex justify-center items-center gap-4">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
            >
              Previous
            </button>
            {renderPageNumbers()}
            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
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