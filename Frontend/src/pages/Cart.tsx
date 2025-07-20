import React, { useContext, useEffect, useState } from "react";
import { shopContext } from "../context/shopContext";
import Title from "../components/Title";
import { assets } from "../assets/assets";
import CartTotal from "../components/CartTotal";
import { useNavigate, Link } from "react-router-dom"; // Add Link import

// Define type for cart product
interface CartProduct {
  productId: string;
  name: string;
  price: number;
  size: string;
  quantity: number;
  images: string[];
  stock: number;
}

// Cart component to display and manage cart items
const Cart: React.FC = () => {
  const context = useContext(shopContext);
  // Check if context is available
  if (!context) {
    return <div>Error: Shop context not available</div>;
  }

  const { cartItem, removeCartItem, updateCartItem, products, currency, isCartLoading } = context;
  const [cartItemList, setCartItemList] = useState<CartProduct[]>([]);
  const navigate = useNavigate();

  // Transform cart data into a list of products when cart or products change
  useEffect(() => {
    if (cartItem && products && !isCartLoading) {
      const cartProducts: CartProduct[] = [];
      Object.keys(cartItem).forEach((productId) => {
        const product = products.find((p) => p._id === productId);
        if (product && cartItem[productId]) {
          Object.keys(cartItem[productId]).forEach((size) => {
            const quantity = cartItem[productId][size];
            if (quantity > 0) {
              cartProducts.push({
                productId,
                name: product.name,
                price: product.price,
                size,
                quantity,
                images: product.images || [],
                stock: product.stock || 0,
              });
            }
          });
        }
      });
      setCartItemList(cartProducts);
    }
  }, [cartItem, products, isCartLoading]);

  // Handle quantity changes for cart items
  const handleQuantityChange = (productId: string, size: string, value: string) => {
    const newQuantity = parseInt(value);
    if (isNaN(newQuantity) || newQuantity < 0) return;
    if (newQuantity === 0) {
      removeCartItem(productId, size);
    } else {
      updateCartItem(productId, size, newQuantity);
    }
  };

  // Display loading state while cart data is being fetched
  if (isCartLoading) {
    return (
      <div className="border-t pt-14 min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
          <p className="text-lg text-gray-600">Loading cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t pt-14 min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cart title */}
        <div className="text-3xl mb-8 text-center">
          <Title text1={"YOUR"} text2={"CART"} />
        </div>
        {/* Empty cart display */}
        {cartItemList.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg text-gray-600 mb-6">Your cart is empty</p>
            <button
              onClick={() => navigate("/collection")}
              className="bg-black text-white px-8 py-3 rounded-md hover:bg-gray-800 transition-colors font-medium"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <>
            {/* Cart items list */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
              {cartItemList.map((item, index) => (
                <div
                  key={`${item.productId}-${item.size}-${index}`}
                  className={`p-6 ${
                    index !== cartItemList.length - 1 ? "border-b border-gray-200" : ""
                  } hover:bg-gray-50 transition-colors`}
                >
                  <div className="flex flex-col sm:flex-row items-start gap-6">
                    {/* Product image */}
                    <div className="flex-shrink-0">
                      {item.images && item.images[0] ? (
                        <Link to={`/product/${item.productId}`} className="hover:opacity-80">
                          <img
                            className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg border border-gray-200"
                            src={item.images[0]}
                            alt={item.name}
                            onError={(e) => {
                              e.currentTarget.src = 'https://via.placeholder.com/100';
                            }}
                          />
                        </Link>
                      ) : (
                        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-gray-400 text-sm">No image</span>
                        </div>
                      )}
                    </div>

                    {/* Product details */}
                    <div className="flex-grow min-w-0">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div className="flex-grow">
                          <Link to={`/product/${item.productId}`} className="hover:underline">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.name}</h3>
                          </Link>
                          <div className="flex flex-wrap items-center gap-4 mb-3">
                            <span className="text-xl font-bold text-gray-900">
                              {currency}
                              {item.price}
                            </span>
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                              Size: {item.size}
                            </span>
                          </div>
                          {/* Stock warning */}
                          {item.quantity > item.stock && (
                            <p className="text-red-600 text-sm font-medium mb-2">
                              Only {item.stock} items left in stock
                            </p>
                          )}
                        </div>

                        {/* Quantity controls and remove button */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center border border-gray-300 rounded-md">
                            <button
                              onClick={() =>
                                handleQuantityChange(
                                  item.productId,
                                  item.size,
                                  String(Math.max(0, item.quantity - 1))
                                )
                              }
                              className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                            >
                              -
                            </button>
                            <input
                              className="w-16 px-2 py-2 text-center border-0 focus:outline-none focus:ring-0"
                              min={0}
                              max={item.stock}
                              value={item.quantity}
                              onChange={(e) =>
                                handleQuantityChange(item.productId, item.size, e.target.value)
                              }
                            />
                            <button
                              onClick={() =>
                                handleQuantityChange(
                                  item.productId,
                                  item.size,
                                  String(Math.min(item.stock, item.quantity + 1))
                                )
                              }
                              className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                              disabled={item.quantity >= item.stock}
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => removeCartItem(item.productId, item.size)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                            title="Remove item"
                          >
                            <img className="w-5 h-5" src={assets.bin_icon} alt="Remove" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart summary and checkout */}
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-grow"></div>
              <div className="lg:w-96">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <CartTotal />
                  <button
                    onClick={() => navigate("/placeorder")}
                    className="w-full bg-black text-white text-sm font-medium py-4 px-6 rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed mt-6"
                    disabled={cartItemList.length === 0 || cartItemList.some((item) => item.quantity > item.stock)}
                  >
                    PROCEED TO CHECKOUT
                  </button>
                  <button
                    onClick={() => navigate("/collection")}
                    className="w-full border border-gray-300 text-gray-700 text-sm font-medium py-4 px-6 rounded-md hover:bg-gray-50 transition-colors mt-3"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Cart;