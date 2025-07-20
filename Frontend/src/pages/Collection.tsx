import React, { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { shopContext } from "../context/shopContext";
import { assets } from "../assets/assets";
import Title from "../components/Title";
import ProductItem from "../components/ProductItem";
import axios from "axios";
import { toast } from "react-toastify";

// Define product and pagination interfaces
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

interface Pagination {
  total: number;
  page: number;
  pages: number;
}

// Collection component to display filtered and paginated products
const Collection: React.FC = () => {
  const { backendUrl, token, csrfToken, fetchCsrfToken, search, setSearch, showSearch, setShowSearch } =
    useContext(shopContext)!;
  const location = useLocation();
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({
    min: 0,
    max: Infinity,
  });
  const [minRating, setMinRating] = useState<number>(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortType, setSortType] = useState<string>("relevant");
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    pages: 1,
  });
  const [loading, setLoading] = useState(false);

  // Parse URL query parameters to initialize filters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const page = Number(params.get("page")) || 1;
    const categories = params.get("category")?.split(",")?.filter(Boolean) || [];
    const subCategories = params.get("subCategory")?.split(",")?.filter(Boolean) || [];
    const minPrice = Number(params.get("minPrice")) || 0;
    const maxPrice = Number(params.get("maxPrice")) || Infinity;
    const minRatingParam = Number(params.get("minRating")) || 0;
    const inStock = params.get("inStock") === "true";
    const sort = params.get("sort") || "relevant";
    const searchParam = params.get("search") || "";

    setSelectedCategories(categories);
    setSelectedSubCategories(subCategories);
    setPriceRange({ min: minPrice, max: maxPrice });
    setMinRating(minRatingParam);
    setInStockOnly(inStock);
    setSortType(sort);
    setSearch(searchParam);
    setShowSearch(!!searchParam);
    setPagination((prev) => ({ ...prev, page }));
  }, [location.search, setSearch, setShowSearch]);

  // Fetch categories and subcategories from backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/product/categories`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-CSRF-Token": csrfToken,
          },
          withCredentials: true,
        });
        if (response.data.success) {
          setCategories(response.data.categories);
          setSubCategories(response.data.subCategories);
        } else {
          toast.error(response.data.message || "Failed to fetch categories");
        }
      } catch (error: any) {
        toast.error("An error occurred while fetching categories");
      }
    };
    fetchCategories();
  }, [backendUrl, token, csrfToken]);

  // Update URL with current filters and page
  useEffect(() => {
    const params = new URLSearchParams();
    if (pagination.page > 1) params.set("page", pagination.page.toString());
    if (selectedCategories.length > 0) params.set("category", selectedCategories.join(","));
    if (selectedSubCategories.length > 0) params.set("subCategory", selectedSubCategories.join(","));
    if (priceRange.min !== 0) params.set("minPrice", priceRange.min.toString());
    if (priceRange.max !== Infinity) params.set("maxPrice", priceRange.max.toString());
    if (minRating !== 0) params.set("minRating", minRating.toString());
    if (inStockOnly) params.set("inStock", "true");
    if (sortType !== "relevant") params.set("sort", sortType);
    if (showSearch && search.trim()) params.set("search", search.trim());

    navigate(`?${params.toString()}`, { replace: true });
  }, [
    selectedCategories,
    selectedSubCategories,
    priceRange,
    minRating,
    inStockOnly,
    sortType,
    search,
    showSearch,
    pagination.page,
    navigate,
  ]);

  // Fetch products based on filters and pagination
  const fetchProducts = async (page: number) => {
    setLoading(true);
    try {
      let currentCsrfToken = csrfToken;
      if (!currentCsrfToken) {
        const fetchedToken = await fetchCsrfToken();
        currentCsrfToken = fetchedToken ?? null;
        if (!currentCsrfToken) {
          toast.error("Failed to fetch CSRF token");
          return;
        }
      }

      const queryParams: any = {
        page,
        limit: 10,
      };
      if (selectedCategories.length > 0) queryParams.category = selectedCategories.join(",");
      if (selectedSubCategories.length > 0) queryParams.subCategory = selectedSubCategories.join(",");
      if (priceRange.min !== 0) queryParams.minPrice = priceRange.min;
      if (priceRange.max !== Infinity) queryParams.maxPrice = priceRange.max;
      if (minRating !== 0) queryParams.minRating = minRating;
      if (showSearch && search.trim()) queryParams.search = search.trim();
      if (sortType !== "relevant") {
        const sortMap: { [key: string]: string } = {
          "low-high": "price:asc",
          "high-low": "price:desc",
          newest: "date:desc",
        };
        queryParams.sort = sortMap[sortType] || "averageRating:desc";
      }
      if (inStockOnly) queryParams.inStock = true;

      const response = await axios.get(`${backendUrl}/api/product/list`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-CSRF-Token": currentCsrfToken,
        },
        params: queryParams,
        withCredentials: true,
      });

      if (response.data.success) {
        setProducts(response.data.products);
        setPagination(response.data.pagination);
      } else {
        toast.error(response.data.message || "Failed to fetch products");
      }
    } catch (error: any) {
      toast.error("An error occurred while fetching products");
    } finally {
      setLoading(false);
    }
  };

  // Trigger product fetch when filters or page change
  useEffect(() => {
    fetchProducts(pagination.page);
  }, [
    selectedCategories,
    selectedSubCategories,
    priceRange,
    minRating,
    inStockOnly,
    sortType,
    search,
    showSearch,
    pagination.page,
    token,
    csrfToken,
  ]);

  // Toggle category filter
  const toggleCategory = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSelectedCategories((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Toggle subcategory filter
  const toggleSubCategory = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSelectedSubCategories((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Reset all filters to default
  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedSubCategories([]);
    setPriceRange({ min: 0, max: Infinity });
    setMinRating(0);
    setInStockOnly(false);
    setSearch("");
    setShowSearch(false);
    setSortType("relevant");
    setPagination({ total: 0, page: 1, pages: 1 });
  };

  // Handle pagination page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination((prev) => ({ ...prev, page: newPage }));
    }
  };

  // Render pagination page numbers
  const renderPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    const startPage = Math.max(1, pagination.page - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(pagination.pages, startPage + maxPagesToShow - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`mx-1 px-3 py-1 rounded ${
            pagination.page === i
              ? "bg-gray-800 text-white"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          {i}
        </button>
      );
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row gap-6 pt-10 border-t">
      {/* Filter Sidebar */}
      <div className="min-w-64">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowFilters(!showFilters)}
        >
          <p className="text-base font-semibold">FILTERS</p>
          <img
            src={assets.dropdown_icon}
            className={`h-2 sm:hidden ${showFilters ? "rotate-90" : ""}`}
          />
        </div>

        <div
          className={`${
            showFilters ? "" : "hidden"
          } sm:block mt-3 space-y-4 text-sm`}
        >
          {/* Categories Filter */}
          <div>
            <p className="font-medium mb-1">CATEGORIES</p>
            {categories.map((category) => (
              <label
                key={category}
                className="flex items-center gap-2 text-gray-700"
              >
                <input
                  type="checkbox"
                  value={category}
                  checked={selectedCategories.includes(category)}
                  onChange={toggleCategory}
                />
                {category}
              </label>
            ))}
          </div>

          {/* Subcategories Filter */}
          <div>
            <p className="font-medium mb-1">SUBCATEGORIES</p>
            {subCategories.map((sub) => (
              <label
                key={sub}
                className="flex items-center gap-2 text-gray-700"
              >
                <input
                  type="checkbox"
                  value={sub}
                  checked={selectedSubCategories.includes(sub)}
                  onChange={toggleSubCategory}
                />
                {sub}
              </label>
            ))}
          </div>

          {/* Price Range Filter */}
          <div>
            <p className="font-medium text-sm mb-1">PRICE</p>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={priceRange.min === 0 ? "" : priceRange.min}
                onChange={(e) =>
                  setPriceRange({
                    ...priceRange,
                    min: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Max"
                value={priceRange.max === Infinity ? "" : priceRange.max}
                onChange={(e) =>
                  setPriceRange({
                    ...priceRange,
                    max: parseFloat(e.target.value) || Infinity,
                  })
                }
                className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Minimum Rating Filter */}
          <div>
            <p className="font-medium mb-1">MINIMUM RATING</p>
            {[1, 2, 3, 4, 5].map((rating) => (
              <label key={rating} className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={minRating === rating}
                  onChange={() => setMinRating(rating)}
                />
                {rating} Stars & Up
              </label>
            ))}
          </div>

          {/* In Stock Filter */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
              />
              In Stock Only
            </label>
          </div>

          {/* Reset Filters Button */}
          <button
            onClick={resetFilters}
            className="text-orange-500 text-xs underline mt-3 hover:text-orange-600"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Main Product Grid */}
      <div className="flex-1">
        <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
          <Title text1="ALL" text2="COLLECTIONS" />
          {/* Sort Options */}
          <div className="flex flex-col sm:flex-row gap-4 items FISHERMAN'S WHARF-center">
            <select
              value={sortType}
              onChange={(e) => setSortType(e.target.value)}
              className="border px-2 py-1 rounded text-sm"
            >
              <option value="relevant">Sort by: Relevant</option>
              <option value="low-high">Sort by: Low to High</option>
              <option value="high-low">Sort by: High to Low</option>
              <option value="newest">Sort by: Newest</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-800 mx-auto"></div>
            <p className="text-gray-500 mt-4">Applying filters to all products...</p>
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No products match your filters</p>
        ) : (
          <>
            {/* Product Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((item) => (
                <ProductItem
                  key={item._id}
                  id={item._id}
                  images={item.images}
                  name={item.name}
                  price={item.price}
                  averageRating={item.averageRating}
                  ratings={item.ratings}
                  stock={item.stock}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="mt-8 flex justify-center items-center gap-4">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
              >
                Previous
              </button>
              {renderPageNumbers()}
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
              >
                Next
              </button>
            </div>
            <p className="mt-4 text-sm text-gray-500 text-center">
              Showing {products.length} of {pagination.total} filtered products (Page{" "}
              {pagination.page} of {pagination.pages})
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Collection;