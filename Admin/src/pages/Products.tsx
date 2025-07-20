import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import { toast } from 'react-toastify';
import { backendUrl, currency } from '../utils/constants';
import ConfirmModal from '../components/ConfirmModal';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  subCategory: string;
  sizes: string[];
  bestseller: boolean;
  stock: number;
  images: string[];
  averageRating: number;
  date: number;
}

interface Pagination {
  total: number;
  page: number;
  pages: number;
}

interface ProductsProps {
  token: string;
}

const Products: React.FC<ProductsProps> = ({ token }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('relevant');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, pages: 1 });
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10); // Matches backend default limit
  const navigate = useNavigate();

  // Fetch CSRF token
  const getCsrfToken = useCallback(async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/csrf-token`, { withCredentials: true });
      return response.data.csrfToken || '';
    } catch (error) {
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

  // Fetch products with pagination
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    let retries = 3;
    while (retries > 0) {
      try {
        const response = await axios.get(`${backendUrl}/api/product/list`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            search,
            sort: sort === 'relevant' ? 'averageRating:desc' : sort === 'newest' ? 'date:desc' : `price:${sort === 'low-high' ? 'asc' : 'desc'}`,
            page: currentPage,
            limit,
          },
          withCredentials: true,
        });
        if (response.data.success) {
          setProducts(response.data.products || []);
          setPagination(response.data.pagination || { total: 0, page: 1, pages: 1 });
          return;
        } else {
          toast.error(response.data.message || 'Failed to fetch products');
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.code === 'ERR_NETWORK' && retries > 1) {
          retries--;
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        toast.error(
          axios.isAxiosError(error)
            ? error.code === 'ERR_NETWORK'
              ? 'Cannot connect to the server. Please check if the backend is running and CORS is configured.'
              : error.response?.data.message || 'Error fetching products'
            : 'An unexpected error occurred while fetching products'
        );
        break;
      } finally {
        setIsLoading(false);
      }
    }
  }, [token, search, sort, currentPage, limit]);

  useEffect(() => {
    if (token) {
      fetchProducts();
    } else {
      toast.error('Please log in to view products');
      navigate('/');
    }
  }, [token, fetchProducts, navigate]);

  // Handle product deletion
  const handleRemoveProduct = (productId: string) => {
    setProductToDelete(productId);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    setDeletingProductId(productToDelete);
    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      setShowConfirmModal(false);
      setProductToDelete(null);
      setDeletingProductId(null);
      return;
    }

    try {
      const response = await axios.post(
        `${backendUrl}/api/product/remove`,
        { id: productToDelete },
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
        toast.success('Product removed successfully');
        fetchProducts();
      } else {
        toast.error(response.data.message || 'Failed to remove product');
      }
    } catch (error) {
      toast.error(
        axios.isAxiosError(error)
          ? error.code === 'ERR_NETWORK'
            ? 'Cannot connect to the server. Please check if the backend is running and CORS is configured.'
            : error.response?.data.message || 'Error removing product'
          : 'An unexpected error occurred while removing product'
      );
    } finally {
      setShowConfirmModal(false);
      setProductToDelete(null);
      setDeletingProductId(null);
    }
  };

  const cancelDelete = () => {
    setShowConfirmModal(false);
    setProductToDelete(null);
  };

  // Handle editing a product
  const handleEditProduct = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  // Handle adding a new product
  const handleAddProduct = () => {
    navigate('/product/new');
  };

  // Handle page change
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
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border p-2 rounded focus:outline-none focus:border-blue-500"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="border p-2 rounded focus:outline-none focus:border-blue-500"
            aria-label="Sort products"
          >
            <option value="relevant">Sort by: Relevant</option>
            <option value="low-high">Sort by: Price Low to High</option>
            <option value="high-low">Sort by: Price High to Low</option>
            <option value="newest">Sort by: Newest</option>
          </select>
          <button
            onClick={handleAddProduct}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add Product
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-800 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No products found.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr
                    key={product._id}
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleEditProduct(product._id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                          onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/50')}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-gray-500">No Image</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{currency}{product.price}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{product.stock}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{product.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProduct(product._id);
                        }}
                        className="bg-yellow-500 text-white px-4 py-1 rounded hover:bg-yellow-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveProduct(product._id);
                        }}
                        className={`px-4 py-1 rounded text-white ${
                          deletingProductId === product._id ? 'bg-red-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'
                        }`}
                        disabled={deletingProductId === product._id}
                      >
                        {deletingProductId === product._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            Showing {products.length} of {pagination.total} products (Page {currentPage} of {pagination.pages})
          </p>
        </>
      )}
      {showConfirmModal && (
        <ConfirmModal
          message="Are you sure you want to delete this product?"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
    </div>
  );
};

export default Products;