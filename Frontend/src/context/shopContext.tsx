import React, { createContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useCookies } from 'react-cookie';

// Define types for context, product, and cart data
type ShopContextType = {
  getProductsData: () => Promise<void>;
  products: Product[];
  currency: string;
  delivery_fee: number;
  cartItem: CartData;
  setCartItem: (cartData: CartData) => void;
  addCartItem: (productId: string, size: string, quantity?: number) => Promise<void>;
  getCartData: () => Promise<void>;
  updateCartItem: (productId: string, size: string, quantity: number) => Promise<void>;
  removeCartItem: (productId: string, size: string) => Promise<void>;
  getCartAmount: () => number;
  backendUrl: string;
  token: string | null;
  setToken: (token: string | null) => void;
  csrfToken: string | null;
  setCsrfToken: (token: string | null) => void;
  search: string;
  setSearch: (search: string) => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  mergeCart: () => Promise<void>;
  fetchCsrfToken: () => Promise<string | null>;
  isCartLoading: boolean;
};

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  subCategory: string;
  sizes: string[];
  stock: number;
  date: number;
  bestseller: boolean;
  ratings: number;
  averageRating: number;
}

interface CartItem {
  [size: string]: number;
}

interface CartData {
  [productId: string]: CartItem;
}

// Create context for sharing shop-related data across components
export const shopContext = createContext<ShopContextType | null>(null);

// Main provider component for shop context
const ShopContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  // Backend URL from environment variable or default to localhost
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
  const currency = 'EGP';
  const delivery_fee = 50;
  // Manage cookies for authentication tokens and user ID
  const [cookies, , removeCookie] = useCookies(['accessToken', 'refreshToken', 'userId']);
  // State for products, cart, tokens, search, and loading status
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItem, setCartItem] = useState<CartData>({});
  const [token, setToken] = useState<string | null>(() => {
    // Initialize token from cookies or localStorage
    const accessToken = cookies.accessToken || localStorage.getItem('accessToken') || null;
    if (accessToken) {
      return accessToken;
    }
    localStorage.removeItem('accessToken');
    return null;
  });
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isCartLoading, setIsCartLoading] = useState(true);
  const isAuthenticated = !!token;
  // Track previous token to detect login state change
  const prevTokenRef = useRef<string | null>(null);

  // Fetch CSRF token from backend for secure requests
  const fetchCsrfToken = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/csrf-token`, { withCredentials: true });
      setCsrfToken(response.data.csrfToken);
      return response.data.csrfToken;
    } catch (error: any) {
      setCsrfToken(null);
      toast.error('Failed to fetch CSRF token');
      return null;
    }
  };

  // Save cart data to localStorage
  const saveCartToStore = (cartData: CartData) => {
    try {
      localStorage.setItem('cartStore', JSON.stringify(cartData));
      setCartItem({ ...cartData });
      setIsCartLoading(false);
    } catch (error) {
      toast.error('Failed to save cart');
      setIsCartLoading(false);
    }
  };

  // Retrieve cart data from localStorage
  const getCartFromStore = (): CartData => {
    try {
      const cartData = localStorage.getItem('cartStore');
      const cart: CartData = cartData ? JSON.parse(cartData) : {};
      return cart;
    } catch (error) {
      toast.error('Failed to load cart');
      return {};
    }
  };

  // Fetch all products from backend
  const getProductsData = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/product/list`);
      if (response.data.success) {
        setProducts(response.data.products);
      } else {
        toast.error('Failed to fetch products');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Fetch cart data from backend or localStorage based on authentication
  const getCartData = async () => {
    setIsCartLoading(true);
    if (!isAuthenticated || !token || !csrfToken) {
      const localCart = getCartFromStore();
      setCartItem({ ...localCart });
      setIsCartLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${backendUrl}/api/cart`, {
        headers: { Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrfToken },
        withCredentials: true,
      });
      if (response.data.success) {
        let cartData: CartData = {};
        if (response.data.cartData && typeof response.data.cartData === 'object' && !Array.isArray(response.data.cartData)) {
          for (const [productId, sizes] of Object.entries(response.data.cartData)) {
            cartData[productId] = {};
            for (const [size, quantity] of Object.entries(sizes as Record<string, number>)) {
              if (quantity > 0) {
                cartData[productId][size] = quantity;
              }
            }
            if (Object.keys(cartData[productId]).length === 0) {
              delete cartData[productId];
            }
          }
        } else if (response.data.cartItems && Array.isArray(response.data.cartItems)) {
          response.data.cartItems.forEach((item: { productId: string; size: string; quantity: number }) => {
            if (!cartData[item.productId]) {
              cartData[item.productId] = {};
            }
            if (item.quantity > 0) {
              cartData[item.productId][item.size] = item.quantity;
            } else {
              delete cartData[item.productId][item.size];
              if (Object.keys(cartData[item.productId]).length === 0) {
                delete cartData[item.productId];
              }
            }
          });
        }
        saveCartToStore(cartData);
      } else {
        toast.error(response.data.message || 'Failed to fetch cart');
        setIsCartLoading(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Error fetching cart');
      const localCart = getCartFromStore();
      setCartItem({ ...localCart });
      setIsCartLoading(false);
    }
  };

  // Add item to cart (backend or localStorage based on authentication)
  const addCartItem = async (productId: string, size: string, quantity: number = 1): Promise<void> => {
    setIsCartLoading(true);
    if (isAuthenticated && token && csrfToken) {
      try {
        const response = await axios.post(
          `${backendUrl}/api/cart/add`,
          { id: productId, size, quantity },
          {
            headers: { Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrfToken },
            withCredentials: true,
          }
        );
        if (response.data.success) {
          const cartData: CartData = {};
          for (const [productId, sizes] of Object.entries(response.data.cartData || {})) {
            cartData[productId] = {};
            for (const [size, qty] of Object.entries(sizes as Record<string, number>)) {
              if (qty > 0) {
                cartData[productId][size] = qty;
              }
            }
            if (Object.keys(cartData[productId]).length === 0) {
              delete cartData[productId];
            }
          }
          saveCartToStore(cartData);
          await getCartData();
          toast.success('Added to cart');
        } else {
          toast.error(response.data.message || 'Failed to add to cart');
          setIsCartLoading(false);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || error.message || 'Error adding to cart');
        setIsCartLoading(false);
      }
    } else {
      const product = products.find((p) => p._id === productId);
      if (!product) {
        toast.error('Product not found');
        return;
      }
      if (!product.sizes.includes(size)) {
        toast.error('Invalid size');
        return;
      }
      if (product.stock < quantity) {
        toast.error('Insufficient stock');
        return;
      }
      const currentCart = getCartFromStore();
      const newCart = { ...currentCart };
      if (!newCart[productId]) {
        newCart[productId] = {};
      }
      newCart[productId][size] = (newCart[productId][size] || 0) + quantity;
      saveCartToStore(newCart);
      toast.success('Added to cart');
    }
  };

  // Update cart item quantity (backend or localStorage)
  const updateCartItem = async (productId: string, size: string, quantity: number): Promise<void> => {
    const product = products.find((p) => p._id === productId);
    if (!product) {
      toast.error('Product not found');
      return;
    }
    if (!product.sizes.includes(size)) {
      toast.error('Invalid size');
      return;
    }
    if (quantity > 0 && product.stock < quantity) {
      toast.error('Insufficient stock');
      return;
    }

    setIsCartLoading(true);
    if (isAuthenticated && token && csrfToken) {
      try {
        const response = await axios.post(
          `${backendUrl}/api/cart/update`,
          { id: productId, size, quantity },
          {
            headers: { Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrfToken },
            withCredentials: true,
          }
        );
        if (response.data.success) {
          const cartData: CartData = {};
          if (response.data.cartData && typeof response.data.cartData === 'object' && !Array.isArray(response.data.cartData)) {
            for (const [productId, sizes] of Object.entries(response.data.cartData)) {
              cartData[productId] = {};
              for (const [size, qty] of Object.entries(sizes as Record<string, number>)) {
                if (qty > 0) {
                  cartData[productId][size] = qty;
                }
              }
              if (Object.keys(cartData[productId]).length === 0) {
                delete cartData[productId];
              }
            }
          } else if (Array.isArray(response.data.cartData)) {
            response.data.cartData.forEach((item: { productId: string; size: string; quantity: number }) => {
              if (!cartData[item.productId]) {
                cartData[item.productId] = {};
              }
              if (item.quantity > 0) {
                cartData[item.productId][item.size] = item.quantity;
              }
            });
          }
          saveCartToStore(cartData);
          toast.success(response.data.message || 'Cart updated');
        } else {
          toast.error(response.data.message || 'Failed to update cart');
          setIsCartLoading(false);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || error.message || 'Error updating cart');
        setIsCartLoading(false);
      }
    } else {
      const currentCart = getCartFromStore();
      const newCart = { ...currentCart };
      if (quantity <= 0) {
        if (newCart[productId]) {
          delete newCart[productId][size];
          if (Object.keys(newCart[productId]).length === 0) {
            delete newCart[productId];
          }
        }
      } else {
        if (!newCart[productId]) {
          newCart[productId] = {};
        }
        newCart[productId][size] = quantity;
      }
      saveCartToStore(newCart);
      toast.success('Cart updated');
    }
  };

  // Remove item from cart (backend or localStorage)
  const removeCartItem = async (productId: string, size: string): Promise<void> => {
    const product = products.find((p) => p._id === productId);
    if (!product) {
      toast.error('Product not found');
      return;
    }
    if (!product.sizes.includes(size)) {
      toast.error('Invalid size');
      return;
    }

    setIsCartLoading(true);
    if (isAuthenticated && token && csrfToken) {
      try {
        const response = await axios.post(
          `${backendUrl}/api/cart/remove`,
          { id: productId, size },
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
          const cartData: CartData = { ...getCartFromStore() };
          if (cartData[productId]) {
            delete cartData[productId][size];
            if (Object.keys(cartData[productId]).length === 0) {
              delete cartData[productId];
            }
          }
          if (response.data.cartData && Array.isArray(response.data.cartData)) {
            const newCartData: CartData = {};
            response.data.cartData.forEach((item: { productId: string; size: string; quantity: number }) => {
              if (!newCartData[item.productId]) {
                newCartData[item.productId] = {};
              }
              if (item.quantity > 0) {
                newCartData[item.productId][item.size] = item.quantity;
              }
            });
            saveCartToStore(newCartData);
          } else {
            saveCartToStore(cartData);
          }
          toast.success(response.data.message || 'Removed from cart');
        } else {
          toast.error(response.data.message || 'Failed to remove from cart');
          setIsCartLoading(false);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || error.message || 'Error removing from cart');
        setIsCartLoading(false);
      }
    } else {
      const currentCart = getCartFromStore();
      const newCart = { ...currentCart };
      if (newCart[productId]) {
        delete newCart[productId][size];
        if (Object.keys(newCart[productId]).length === 0) {
          delete newCart[productId];
        }
        saveCartToStore(newCart);
        toast.success('Removed from cart');
      } else {
        toast.error('Item not found in cart');
      }
    }
  };

  // Calculate total cart amount based on products and quantities
  const getCartAmount = (): number => {
    let totalAmount = 0;
    for (const productId in cartItem) {
      const product = products.find((p) => p._id === productId);
      if (product) {
        for (const size in cartItem[productId]) {
          const quantity = cartItem[productId][size];
          totalAmount += product.price * quantity;
        }
      }
    }
    return totalAmount;
  };

  // Handle user logout and clear tokens/cart
  const logout = async (): Promise<void> => {
    try {
      setToken(null);
      localStorage.removeItem('cartStore');
      localStorage.removeItem('accessToken');
      setCartItem({});
      setIsCartLoading(false);
      removeCookie('accessToken', { path: '/' });
      removeCookie('refreshToken', { path: '/' });
      removeCookie('userId', { path: '/' });
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error: any) {
      toast.error('Error logging out: ' + error.message);
    }
  };

  // Merge local cart with backend cart on login
  const mergeCart = async () => {
    if (!token || !csrfToken) {
      await getCartData();
      return;
    }
    try {
      setIsCartLoading(true);
      const localCartData = getCartFromStore();
      if (Object.keys(localCartData).length === 0) {
        await getCartData();
        return;
      }
      localStorage.removeItem('cartStore');
      const response = await axios.post(
        `${backendUrl}/api/cart/merge`,
        { cartData: localCartData },
        {
          headers: { Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrfToken },
          withCredentials: true,
        }
      );
      if (response.data.success) {
        if (response.data.ignoredItems?.length > 0) {
          toast.warn(
            `Some items were not added to cart: ${response.data.ignoredItems
              .map((item: any) => `${item.productId} (${item.size}): ${item.reason}`)
              .join(', ')}`
          );
        }
        await getCartData();
        toast.success(response.data.message || 'Cart merged successfully');
      } else {
        toast.error(response.data.message || 'Failed to merge cart');
        await getCartData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Error merging cart');
      await getCartData();
    }
  };

  // Initialize app: load cart, fetch products, and merge cart on login
  useEffect(() => {
    const initializeApp = async () => {
      const localCart = getCartFromStore();
      setCartItem({ ...localCart });
      setIsCartLoading(true);

      if (!csrfToken) {
        const fetchedCsrfToken = await fetchCsrfToken();
        if (!fetchedCsrfToken) {
          setIsCartLoading(false);
          return;
        }
      }

      await getProductsData();

      if (isAuthenticated && token && prevTokenRef.current === null) {
        await mergeCart();
      } else if (!isAuthenticated) {
        setIsCartLoading(false);
      } else {
        await getCartData();
      }

      prevTokenRef.current = token;
    };
    initializeApp();
  }, [token, isAuthenticated, csrfToken]);

  // Context value containing all necessary functions and states
  const contextValue: ShopContextType = {
    getProductsData,
    products,
    currency,
    delivery_fee,
    cartItem,
    setCartItem,
    addCartItem,
    getCartData,
    updateCartItem,
    removeCartItem,
    getCartAmount,
    backendUrl,
    token,
    setToken,
    csrfToken,
    setCsrfToken,
    search,
    setSearch,
    showSearch,
    setShowSearch,
    logout,
    isAuthenticated,
    mergeCart,
    fetchCsrfToken,
    isCartLoading,
  };

  return <shopContext.Provider value={contextValue}>{children}</shopContext.Provider>;
};

export default ShopContextProvider;