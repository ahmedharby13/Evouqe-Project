import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { shopContext } from "../context/shopContext";
import { assets } from "../assets/assets";
import axios from "axios";
import { toast } from "react-toastify";
import RelatedProducts from "../components/RelatedProducts";
import { useCookies } from "react-cookie";

// Define interfaces for product, review, and order
interface Product {
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

interface Review {
  userId: { _id: string; name: string };
  rating: number;
  comment: string;
  createdAt: string;
}

interface Order {
  _id: string;
  items: {
    productId: string | { _id: string };
    quantity: number;
    size: string;
  }[];
  status: string;
}

// Product component to display product details and reviews
const Product: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const {
    currency,
    addCartItem,
    backendUrl,
    token,
    csrfToken,
    fetchCsrfToken,
  } = useContext(shopContext)!;
  const [cookies] = useCookies(["userId"]);
  const [productData, setProductData] = useState<Product | null>(null);
  const [image, setImage] = useState<string>("");
  const [size, setSize] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewForm, setReviewForm] = useState<{
    rating: number;
    comment: string;
  }>({ rating: 0, comment: "" });
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"description" | "reviews">(
    "description"
  );

  // Fetch product data from backend
  const fetchProductData = async () => {
    try {
      setLoading(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${backendUrl}/api/product/${productId}`, { headers });
      if (response.data.success) {
        setProductData(response.data.product);
        setImage(response.data.product.images[0] || "");
      } else {
        toast.error(`Failed to fetch product: ${response.data.message}`);
      }
    } catch (error: any) {
      toast.error(`Error fetching product: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch product reviews from backend
  const fetchReviews = async () => {
    try {
      const headers: { Authorization?: string } = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await axios.get(
        `${backendUrl}/api/product/${productId}/ratings`,
        { headers }
      );
      if (response.data.success) {
        setReviews(response.data.reviews || []);
      } else {
        toast.error(`Failed to fetch reviews: ${response.data.message}`);
        setReviews([]);
      }
    } catch (error: any) {
      toast.error(`Error fetching reviews: ${error.message}`);
      setReviews([]);
    }
  };

  // Check if user can submit a review based on order history
  const checkCanReview = async () => {
    const userId = cookies.userId;
    if (!userId || !token) {
      setCanReview(false);
      setHasReviewed(false);
      toast.error("Please log in to leave a review");
      return;
    }

    try {
      let currentCsrfToken = csrfToken;
      if (!currentCsrfToken) {
        const fetchedToken = await fetchCsrfToken();
        if (!fetchedToken) {
          toast.error("Failed to fetch CSRF token");
          setCanReview(false);
          setHasReviewed(false);
          return;
        }
        currentCsrfToken = fetchedToken;
      }

      // Check if user has already reviewed
      const reviewResponse = await axios.get(
        `${backendUrl}/api/product/${productId}/ratings`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (reviewResponse.data.success) {
        const reviews: Review[] = reviewResponse.data.reviews || [];
        const userHasReviewed = reviews.some(
          (review) => review.userId._id === userId
        );
        setHasReviewed(userHasReviewed);
        if (userHasReviewed) {
          setCanReview(false);
          return;
        }
      } else {
        setCanReview(false);
        return;
      }

      // Check user orders for delivered products
      const response = await axios.post(
        `${backendUrl}/api/order/userorders`,
        { userId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-CSRF-Token": currentCsrfToken,
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      if (response.data.success) {
        const orders: Order[] = response.data.orders;
        const hasDeliveredOrder = orders.some((order) => {
          const isDelivered = order.status === "Delivered";
          const hasProduct = order.items.some((item) => {
            const itemProductId =
              typeof item.productId === "string"
                ? item.productId
                : item.productId._id;
            return itemProductId === productId;
          });
          return isDelivered && hasProduct;
        });
        setCanReview(hasDeliveredOrder && !hasReviewed);
      } else {
        toast.error(`Failed to fetch orders: ${response.data.message}`);
        setCanReview(false);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error("Session expired. Please log in again.");
      } else {
        toast.error(`Error checking orders: ${error.message}`);
      }
      setCanReview(false);
      setHasReviewed(false);
    }
  };

  // Handle review form submission
  const handleReviewSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const userId = cookies.userId;
    if (!userId || !token || !csrfToken) {
      toast.error("You must be logged in to submit a review");
      return;
    }
    if (reviewForm.rating < 1 || reviewForm.rating > 5) {
      toast.error("Rating must be between 1 and 5");
      return;
    }
    if (!reviewForm.comment.trim()) {
      toast.error("Please enter a comment");
      return;
    }
    setReviewLoading(true);
    try {
      let currentCsrfToken = csrfToken;
      if (!currentCsrfToken) {
        const fetchedToken = await fetchCsrfToken();
        if (!fetchedToken) {
          toast.error("Failed to fetch CSRF token");
          return;
        }
        currentCsrfToken = fetchedToken;
      }

      const response = await axios.post(
        `${backendUrl}/api/product/review`,
        {
          productId,
          userId,
          rating: reviewForm.rating,
          comment: reviewForm.comment,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-CSRF-Token": currentCsrfToken,
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );
      if (response.data.success) {
        setReviewForm({ rating: 0, comment: "" });
        await Promise.all([
          fetchReviews(),
          fetchProductData(),
          checkCanReview(),
        ]);
      } else {
        const message = response.data.message;
        if (message.includes("already reviewed")) {
          toast.error("You have already reviewed this product.");
          setHasReviewed(true);
          setCanReview(false);
        } else if (message.includes("purchased and received")) {
          toast.error(
            "You can only review products you have purchased and received."
          );
        } else {
          toast.error(message || "Failed to add review");
        }
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Server error";
      if (message.includes("already reviewed")) {
        toast.error("You have already reviewed this product.");
        setHasReviewed(true);
        setCanReview(false);
      } else if (message.includes("purchased and received")) {
        toast.error(
          "You can only review products you have purchased and received."
        );
      } else {
        toast.error(message);
      }
    } finally {
      setReviewLoading(false);
    }
  };

  // Handle star rating selection
  const handleStarClick = (rating: number) => {
    setReviewForm({ ...reviewForm, rating });
  };

  // Fetch product, reviews, and review eligibility on mount
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchProductData(), fetchReviews()]);
      if (productId && token && cookies.userId && csrfToken) {
        await checkCanReview();
      }
    };
    if (productId) {
      fetchData();
    }
  }, [productId, token, cookies.userId, csrfToken]);

  // Handle adding product to cart
  const handleAddToCart = () => {
    if (!productData) {
      toast.error("Product data not available");
      return;
    }
    if (!size) {
      toast.error("Please select a size");
      return;
    }
    if (productData.stock === 0) {
      toast.error("This product is out of stock");
      return;
    }
    addCartItem(productData._id, size);
  };

  return loading ? (
    <div className="text-center text-gray-500">Loading...</div>
  ) : !productData ? (
    <div className="text-center text-gray-500">Product not found</div>
  ) : (
    <div className="border-t-2 pt-10 transition-opacity ease-in duration-500 opacity-100">
      {/* Product Display */}
      <div className="flex flex-col sm:flex-row gap-12">
        <div className="flex-1 flex flex-col-reverse gap-3 sm:flex-row">
          <div className="flex sm:flex-col overflow-x-auto sm:overflow-y-auto justify-between sm:justify-normal sm:w-[18.7%] w-full">
            {productData.images.length > 0 ? (
              productData.images.map((item, index) => (
                <img
                  onClick={() => setImage(item)}
                  src={item}
                  key={index}
                  className="w-[24%] sm:w-full sm:mb-3 flex-shrink-0 cursor-pointer"
                  alt={`Thumbnail ${index + 1}`}
                />
              ))
            ) : (
              <p className="text-gray-500">No images available</p>
            )}
          </div>
          <div className="w-full sm:w-[80%]">
            {image ? (
              <img
                className="w-full h-auto"
                src={image}
                alt={productData.name}
              />
            ) : (
              <p className="text-gray-500">No image available</p>
            )}
          </div>
        </div>
        <div className="flex-1">
          <h1 className="font-medium text-2xl mt-2">{productData.name}</h1>
          <div className="flex items-center gap-1 mt-2">
            {[...Array(Math.floor(productData.averageRating))].map((_, i) => (
              <img
                key={i}
                src={assets.star_icon}
                alt="star"
                className="w-3.5"
              />
            ))}
            {[...Array(5 - Math.floor(productData.averageRating))].map(
              (_, i) => (
                <img
                  key={i}
                  src={assets.star_dull_icon}
                  alt="dull star"
                  className="w-3.5"
                />
              )
            )}
            <p className="pl-2">({productData.ratings})</p>
          </div>
          <p className="mt-5 text-3xl font-medium">
            {currency} {productData.price}
          </p>
          {productData.stock === 0 ? (
            <p className="mt-2 text-red-500 font-medium">Out of Stock</p>
          ) : productData.stock <= 5 ? (
            <p className="mt-2 text-red-500 font-medium">
              Only {productData.stock} items left in stock!
            </p>
          ) : null}
          <p className="mt-5 text-gray-500 md:w-4/5">
            {productData.description}
          </p>
          <div className="flex flex-col gap-4 my-8">
            <p>Select Size</p>
            <div className="flex gap-2">
              {productData.sizes.map((item, index) => (
                <button
                  onClick={() => setSize(item)}
                  key={index}
                  className={`border py-2 px-4 bg-gray-100 ${
                    item === size ? "border-orange-500" : ""
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleAddToCart}
            className={`bg-black text-white px-8 py-3 text-sm ${
              productData.stock === 0
                ? "opacity-50 cursor-not-allowed"
                : "active:bg-gray-700"
            }`}
            disabled={productData.stock === 0}
          >
            Add to Cart
          </button>
          <hr className="mt-8 sm:w-4/5" />
          <div className="text-sm text-gray-500 mt-5 flex flex-col gap-1">
            <p>100% Original product.</p>
            <p>Cash on delivery is available on this product.</p>
            <p>Easy return and exchange policy within 14 days.</p>
          </div>
        </div>
      </div>
      {/* Tabs for Description and Reviews */}
      <div className="mt-20">
        <div className="flex">
          <button
            onClick={() => setActiveTab("description")}
            className={`border px-5 py-3 text-sm ${
              activeTab === "description" ? "font-bold bg-gray-100" : ""
            }`}
          >
            Description
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className={`border px-5 py-3 text-sm ${
              activeTab === "reviews" ? "font-bold bg-gray-100" : ""
            }`}
          >
            Reviews ({productData.ratings})
          </button>
        </div>
        {activeTab === "description" && (
          <div className="flex flex-col gap-4 border px-6 py-6 text-sm text-gray-500">
            <p>{productData.description}</p>
          </div>
        )}
        {activeTab === "reviews" && (
          <div className="flex flex-col gap-4 border px-6 py-6 text-sm text-gray-500">
            <h3 className="text-lg font-medium text-black">Add a Review</h3>
            {cookies.userId ? (
              hasReviewed ? (
                <p className="text-red-500">
                  You have already reviewed this product.
                </p>
              ) : canReview ? (
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div>
                    <label className="block text-gray-700 mb-2">Rating</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <img
                          key={star}
                          src={
                            reviewForm.rating >= star
                              ? assets.star_icon
                              : assets.star_dull_icon
                          }
                          alt={`Star ${star}`}
                          className="w-5 cursor-pointer"
                          onClick={() => handleStarClick(star)}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">Comment</label>
                    <textarea
                      value={reviewForm.comment}
                      onChange={(e) =>
                        setReviewForm({
                          ...reviewForm,
                          comment: e.target.value,
                        })
                      }
                      placeholder="Enter your comment (max 500 characters)"
                      className="w-full p-2 border rounded focus:outline-none focus:border-orange-500"
                      maxLength={500}
                      rows={4}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={reviewLoading}
                    className={`w-full bg-black text-white p-2 rounded ${
                      reviewLoading
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-orange-500"
                    } transition-colors`}
                  >
                    {reviewLoading ? "Submitting..." : "Submit Review"}
                  </button>
                </form>
              ) : (
                <p className="text-red-500">
                  You can only review products you have purchased and received.
                </p>
              )
            ) : (
              <p className="text-red-500">Please log in to submit a review.</p>
            )}
            <h3 className="text-lg font-medium text-black mt-6">
              Current Reviews
            </h3>
            {reviewLoading ? (
              <p>Loading reviews...</p>
            ) : reviews.length > 0 ? (
              reviews.map((review, index) => (
                <div key={index} className="border-t pt-4 mt-4">
                  <div className="flex items-center gap-1">
                    {[...Array(review.rating)].map((_, i) => (
                      <img
                        key={i}
                        src={assets.star_icon}
                        alt="star"
                        className="w-3.5"
                      />
                    ))}
                    {[...Array(5 - review.rating)].map((_, i) => (
                      <img
                        key={i}
                        src={assets.star_dull_icon}
                        alt="dull star"
                        className="w-3.5"
                      />
                    ))}
                    <p className="pl-2 text-sm">
                      By {review.userId?.name || "Anonymous"}
                    </p>
                  </div>
                  <p className="mt-2">{review.comment || "No comment"}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString("en-US")}
                  </p>
                </div>
              ))
            ) : (
              <p>No reviews for this product yet.</p>
            )}
          </div>
        )}
      </div>
      {/* Related Products */}
      <RelatedProducts
        category={productData.category}
        subCategory={productData.subCategory}
      />
    </div>
  );
};

export default Product;