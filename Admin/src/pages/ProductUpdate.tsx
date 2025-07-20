import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import axios from 'axios';
import { toast } from 'react-toastify';
import { backendUrl } from '../utils/constants';

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
}

interface FormData {
  name: string;
  description: string;
  price: number;
  category: string;
  subCategory: string;
  sizes: string[];
  bestseller: boolean;
  stock: number;
  image1?: File;
  image2?: File;
  image3?: File;
  image4?: File;
}

interface ImagePreviews {
  image1: string;
  image2: string;
  image3: string;
  image4: string;
}

interface ProductUpdateProps {
  token: string;
}


const ProductUpdate: React.FC<ProductUpdateProps> = ({ token }) => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    price: 0,
    category: '',
    subCategory: '',
    sizes: [],
    bestseller: false,
    stock: 0,
    image1: undefined,
    image2: undefined,
    image3: undefined,
    image4: undefined,
  });
  const [imagePreviews, setImagePreviews] = useState<ImagePreviews>({
    image1: '',
    image2: '',
    image3: '',
    image4: '',
  });
  const [sizeInput, setSizeInput] = useState('');

  const fetchCsrfToken = useCallback(async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/csrf-token`, {
        withCredentials: true,
      });
      if (response.data.success) {
        setCsrfToken(response.data.csrfToken);
        return response.data.csrfToken;
      } else {
        throw new Error('Failed to fetch CSRF token');
      }
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      toast.error('Error fetching CSRF token');
      return null;
    }
  }, []);

  const fetchProductData = useCallback(async () => {
  if (productId === 'new') return;
  setIsLoading(true);
  try {
    const response = await axios.get(`${backendUrl}/api/product/${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true,
    });
    if (response.data.success) {
      const product: Product = response.data.product;
      const updatedFormData = {
        name: product.name || '',
        description: product.description || '',
        price: product.price || 0, // Use 0 as default instead of null
        category: product.category || '',
        subCategory: product.subCategory || '',
        sizes: product.sizes || [],
        bestseller: product.bestseller || false,
        stock: product.stock || 0,
        image1: undefined,
        image2: undefined,
        image3: undefined,
        image4: undefined,
      };
      setFormData(updatedFormData);
      setImagePreviews({
        image1: product.images[0] || '',
        image2: product.images[1] || '',
        image3: product.images[2] || '',
        image4: product.images[3] || '',
      });
    } else {
      toast.error(response.data.message || 'Product not found');
      navigate('/products');
    }
  } catch (error) {
    console.error('Error fetching product:', error);
    toast.error('Error fetching product');
    navigate('/products');
  } finally {
    setIsLoading(false);
  }
}, [productId, token, navigate]);

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        const csrfToken = await fetchCsrfToken();
        if (!csrfToken) throw new Error('Failed to fetch CSRF token');
        if (productId !== 'new') {
          await fetchProductData();
        }
      } catch (error) {
        console.error('Initialization error:', error);
        toast.error('Failed to initialize product data');
      } finally {
        setIsLoading(false);
      }
    };
    if (token) {
      initialize();
    } else {
      toast.error('Please log in to edit products');
      navigate('/');
    }
  }, [token, productId, fetchCsrfToken, fetchProductData, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData((prev) => ({
        ...prev,
        [name]: files[0],
      }));
      setImagePreviews((prev) => ({
        ...prev,
        [name]: URL.createObjectURL(files[0]),
      }));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, name: string) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      setFormData((prev) => ({
        ...prev,
        [name]: files[0],
      }));
      setImagePreviews((prev) => ({
        ...prev,
        [name]: URL.createObjectURL(files[0]),
      }));
    }
  };

  const handleRemoveImage = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: undefined,
    }));
    setImagePreviews((prev) => ({
      ...prev,
      [name]: '',
    }));
  };

  const handleSizeAdd = () => {
    if (sizeInput && !formData.sizes.includes(sizeInput)) {
      setFormData((prev) => ({
        ...prev,
        sizes: [...prev.sizes, sizeInput],
      }));
      setSizeInput('');
    }
  };

  const handleSizeRemove = (size: string) => {
    setFormData((prev) => ({
      ...prev,
      sizes: prev.sizes.filter((s) => s !== size),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price.toString());
      formDataToSend.append('category', formData.category);
      formDataToSend.append('subCategory', formData.subCategory);
      formDataToSend.append('sizes', JSON.stringify(formData.sizes));
      formDataToSend.append('bestseller', formData.bestseller.toString());
      formDataToSend.append('stock', formData.stock.toString());
      if (formData.image1) formDataToSend.append('image1', formData.image1);
      if (formData.image2) formDataToSend.append('image2', formData.image2);
      if (formData.image3) formDataToSend.append('image3', formData.image3);
      if (formData.image4) formDataToSend.append('image4', formData.image4);

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-csrf-token': csrfToken,
        },
        withCredentials: true,
      };

      let response;
      if (productId === 'new') {
        response = await axios.post(`${backendUrl}/api/product/add`, formDataToSend, config);
      } else {
        response = await axios.put(`${backendUrl}/api/product/${productId}`, formDataToSend, config);
      }

      if (response.data.success) {
        toast.success(response.data.message || 'Product saved successfully');
        navigate('/products');
      } else {
        toast.error(response.data.message || 'Failed to save product');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Error saving product');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4" style={{ minHeight: '100vh', zIndex: 1 }}>
      <h1 className="text-2xl font-bold mb-6">{productId === 'new' ? 'Add Product' : 'Update Product'}</h1>
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-800 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md" style={{ minHeight: '500px', zIndex: 10, position: 'relative' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                Price
              </label>
              <input
                id="price"
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:outline-none focus:border-blue-500"
                required
                min="0"
              />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <input
                id="category"
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="subCategory" className="block text-sm font-medium text-gray-700 mb-2">
                Sub Category
              </label>
              <input
                id="subCategory"
                type="text"
                name="subCategory"
                value={formData.subCategory}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-2">
                Stock
              </label>
              <input
                id="stock"
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:outline-none focus:border-blue-500"
                required
                min="1"
              />
            </div>
            <div>
              <label htmlFor="sizeInput" className="block text-sm font-medium text-gray-700 mb-2">
                Sizes
              </label>
              <div className="flex gap-2">
                <input
                  id="sizeInput"
                  type="text"
                  value={sizeInput}
                  onChange={(e) => setSizeInput(e.target.value)}
                  className="w-full p-2 border rounded focus:outline-none focus:border-blue-500"
                  placeholder="Enter size (e.g., S, M, L)"
                />
                <button
                  type="button"
                  onClick={handleSizeAdd}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Add
                </button>
              </div>
              <div className="mt-2">
                {formData.sizes.map((size, index) => (
                  <span
                    key={index}
                    className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2"
                  >
                    {size}
                    <button
                      type="button"
                      onClick={() => handleSizeRemove(size)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            {['image1', 'image2', 'image3', 'image4'].map((imageName) => (
              <div key={imageName}>
                <label htmlFor={imageName} className="block text-sm font-medium text-gray-700 mb-2">
                  {imageName}
                </label>
                <div
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-blue-500"
                  onDrop={(e) => handleDrop(e, imageName)}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => document.getElementById(imageName)?.click()}
                >
                  <input
                    id={imageName}
                    type="file"
                    name={imageName}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                  />
                  {imagePreviews[imageName as keyof ImagePreviews] ? (
                    <div className="relative">
                      <img
                        src={imagePreviews[imageName as keyof ImagePreviews]}
                        alt={`${imageName} preview`}
                        className="mt-2 w-32 h-32 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(imageName)}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                      >
                        x
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center">Click or drag to upload</p>
                  )}
                </div>
              </div>
            ))}
            <div className="col-span-2 flex items-center">
              <input
                id="bestseller"
                type="checkbox"
                name="bestseller"
                checked={formData.bestseller}
                onChange={handleInputChange}
                className="mr-2"
              />
              <label htmlFor="bestseller" className="text-sm font-medium text-gray-700">
                Bestseller
              </label>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <button
              type="submit"
              disabled={isLoading}
              className={`flex-1 bg-black text-white p-2 rounded ${
                isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
              } transition-colors`}
            >
              {isLoading ? 'Saving...' : productId === 'new' ? 'Add Product' : 'Update Product'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="flex-1 bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ProductUpdate;