import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { backendUrl } from '../utils/constants';
import ConfirmModal from '../components/ConfirmModal';

// Define interface for user structure
interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
}

// Define interface for pagination structure
interface Pagination {
  total: number;
  page: number;
  pages: number;
}

// Define props interface for type safety
interface UsersProps {
  token: string;
}

const Users: React.FC<UsersProps> = ({ token }) => {
  // State for users, loading status, search, filter, modals, and pagination
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, pages: 1 });
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const navigate = useNavigate();

  // Fetch CSRF token for secure API calls
  const getCsrfToken = useCallback(async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/csrf-token`, { withCredentials: true });
      return response.data.csrfToken || '';
    } catch (error) {
      // Handle errors during CSRF token fetch
      toast.error(
        axios.isAxiosError(error)
          ? error.code === 'ERR_NETWORK'
            ? 'Cannot connect to the server. Please check if the backend is running and CORS is configured.'
            : error.response?.data.message || 'Error fetching CSRF token'
          : 'An unexpected error occurred while fetching CSRF token'
      );
      return '';
    }
  }, []);

  // Fetch users with pagination, search, and role filtering
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    let retries = 3;
    while (retries > 0) {
      try {
        // Make API call to fetch users
        const response = await axios.get(`${backendUrl}/api/user/users`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            search,
            role: filter !== 'all' ? filter : undefined,
            page: currentPage,
            limit,
          },
          withCredentials: true,
        });
        if (response.data.success) {
          setUsers(response.data.users || []);
          setPagination(response.data.pagination || { total: 0, page: 1, pages: 1 });
          return;
        } else {
          toast.error(response.data.message || 'Failed to fetch users');
        }
      } catch (error) {
        // Handle errors with retry logic for network issues
        if (axios.isAxiosError(error) && error.code === 'ERR_NETWORK' && retries > 1) {
          retries--;
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        toast.error(
          axios.isAxiosError(error)
            ? error.code === 'ERR_NETWORK'
              ? 'Cannot connect to the server. Please check if the backend is running and CORS is configured.'
              : error.response?.data.message || 'Error fetching users'
            : 'An unexpected error occurred while fetching users'
        );
        break;
      } finally {
        setIsLoading(false);
      }
    }
  }, [token, search, filter, currentPage, limit]);

  // Fetch users on component mount or when dependencies change
  useEffect(() => {
    if (token) {
      fetchUsers();
    } else {
      toast.error('Please log in to view users');
      navigate('/');
    }
  }, [token, fetchUsers, navigate]);

  // Handle user deletion initiation
  const handleRemoveUser = (userId: string) => {
    setUserToDelete(userId);
    setShowConfirmModal(true);
  };

  // Confirm user deletion
  const confirmDelete = async () => {
    if (!userToDelete) return;
    setDeletingUserId(userToDelete);
    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      setShowConfirmModal(false);
      setUserToDelete(null);
      setDeletingUserId(null);
      return;
    }

    try {
      // Make API call to delete user
      const response = await axios.delete(`${backendUrl}/api/user/delete-user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-CSRF-Token': csrfToken,
          'Content-Type': 'application/json',
        },
        data: { userId: userToDelete },
        withCredentials: true,
      });
      if (response.data.success) {
        toast.success('User deleted successfully');
        fetchUsers();
      } else {
        toast.error(response.data.message || 'Failed to delete user');
      }
    } catch (error) {
      // Handle errors during user deletion
      toast.error(
        axios.isAxiosError(error)
          ? error.code === 'ERR_NETWORK'
            ? 'Cannot connect to the server. Please check if the backend is running and CORS is configured.'
            : error.response?.data.message || 'Error deleting user'
          : 'An unexpected error occurred while deleting user'
      );
    } finally {
      setShowConfirmModal(false);
      setUserToDelete(null);
      setDeletingUserId(null);
    }
  };

  // Cancel user deletion
  const cancelDelete = () => {
    setShowConfirmModal(false);
    setUserToDelete(null);
  };

  // Handle admin creation
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      toast.error('Failed to fetch CSRF token');
      return;
    }

    try {
      // Make API call to create admin
      const response = await axios.post(
        `${backendUrl}/api/user/create-admin`,
        adminForm,
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
        toast.success(response.data.message);
        setShowCreateAdminModal(false);
        setAdminForm({ name: '', email: '', password: '', confirmPassword: '' });
        fetchUsers();
      } else {
        toast.error(response.data.message || 'Failed to create admin');
      }
    } catch (error) {
      // Handle errors during admin creation
      toast.error(
        axios.isAxiosError(error)
          ? error.code === 'ERR_NETWORK'
            ? 'Cannot connect to the server. Please check if the backend is running and CORS is configured.'
            : error.response?.data.message || 'Error creating admin'
          : 'An unexpected error occurred while creating admin'
      );
    }
  };

  // Handle page change for pagination
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.pages) {
      setCurrentPage(page);
    }
  };

  // Render pagination buttons
  const renderPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    const thresholdForEllipsis = 6;

    if (pagination.pages <= maxPagesToShow) {
      for (let i = 1; i <= pagination.pages; i++) {
        pages.push(
          <button
            key={i}
            onClick={() => handlePageChange(i)}
            className={`mx-1 px-3 py-1 rounded ${
              currentPage === i
                ? 'bg-gray-800 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {i}
          </button>
        );
      }
    } else {
      let startPage = Math.max(1, currentPage);
      let endPage = Math.min(startPage + maxPagesToShow - 1, pagination.pages);

      if (currentPage > pagination.pages - maxPagesToShow) {
        startPage = pagination.pages - maxPagesToShow + 1;
        endPage = pagination.pages;
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(
          <button
            key={i}
            onClick={() => handlePageChange(i)}
            className={`mx-1 px-3 py-1 rounded ${
              currentPage === i
                ? 'bg-gray-800 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {i}
          </button>
        );
      }

      if (pagination.pages > thresholdForEllipsis && endPage < pagination.pages) {
        pages.push(
          <span key="ellipsis" className="mx-1 px-3 py-1 text-gray-800">
            ...
          </span>
        );
        pages.push(
          <button
            key={pagination.pages}
            onClick={() => handlePageChange(pagination.pages)}
            className={`mx-1 px-3 py-1 rounded ${
              currentPage === pagination.pages
                ? 'bg-gray-800 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {pagination.pages}
          </button>
        );
      }
    }

    return pages;
  };

  return (
    // Main container for users list
    <div className="container mx-auto p-4">
      {/* Header with title, search, filter, and create admin button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border p-2 rounded focus:outline-none focus:border-blue-500"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border p-2 rounded focus:outline-none focus:border-blue-500"
            aria-label="Filter users"
          >
            <option value="all">All Users</option>
            <option value="user">Users Only</option>
            <option value="admin">Admins Only</option>
          </select>
          <button
            onClick={() => setShowCreateAdminModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Create Admin
          </button>
        </div>
      </div>

      {isLoading ? (
        // Display loading spinner and message
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-800 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        // Display message if no users are found
        <p className="text-gray-500 text-center py-12">No users found.</p>
      ) : (
        <>
          {/* Users table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-100">
                    <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.isVerified ? (
                        <span className="text-green-500">Verified</span>
                      ) : (
                        <span className="text-red-500">Not Verified</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.role !== 'admin' && ( // Prevent deletion of admins
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveUser(user._id);
                          }}
                          className={`px-4 py-1 rounded text-white ${
                            deletingUserId === user._id ? 'bg-red-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'
                          }`}
                          disabled={deletingUserId === user._id}
                        >
                          {deletingUserId === user._id ? 'Deleting...' : 'Delete'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination controls */}
          <div className="mt-8 flex justify-center items-center gap-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
            >
              Previous
            </button>
            {renderPageNumbers()}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === pagination.pages}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
            >
              Next
            </button>
          </div>
          <p className="mt-4 text-sm text-gray-500 text-center">
            Showing {users.length} of {pagination.total} users (Page {currentPage} of {pagination.pages})
          </p>
        </>
      )}

      {/* Confirm deletion modal */}
      {showConfirmModal && (
        <ConfirmModal
          message="Are you sure you want to delete this user?"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}

      {/* Create admin modal */}
      {showCreateAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Admin</h2>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                  className="mt-1 block w-full border p-2 rounded focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="mt-1 block w-full border p-2 rounded focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  className="mt-1 block w-full border p-2 rounded focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                <input
                  type="password"
                  value={adminForm.confirmPassword}
                  onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                  className="mt-1 block w-full border p-2 rounded focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowCreateAdminModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Create Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;