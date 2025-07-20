import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import productModel, { Product } from '../models/productModel';
import userModel from '../models/userModel';
import orderModel from '../models/orderModel';
import logger from '../utils/logger';

// Interfaces
interface ProductFiles {
  image1?: Express.Multer.File[];
  image2?: Express.Multer.File[];
  image3?: Express.Multer.File[];
  image4?: Express.Multer.File[];
}

interface ProductData {
  name: string;
  description: string;
  price: number;
  category: string;
  subCategory: string;
  sizes: string[];
  bestseller: boolean;
  images: string[];
  date: Date;
  stock: number;
}

interface ProductRequestBody {
  name: string;
  description: string;
  price: string;
  category: string;
  subCategory: string;
  sizes: string;
  bestseller: string;
  stock: string;
}

interface ReviewRequestBody {
  productId: string;
  userId: string;
  rating: number;
  comment: string;
}

// Helper function to validate product inputs
const validateProductInputs = (body: ProductRequestBody): ProductData => {
  const { name, description, price, category, subCategory, sizes, bestseller, stock } = body;

  // Validate required fields
  if (!name || !description || !price || !category || !subCategory || !sizes || !stock) {
    throw new Error('All fields are required');
  }

  // Validate price
  const parsedPrice = Number(price);
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    throw new Error('Invalid price');
  }

  // Validate stock
  const parsedStock = Number(stock);
  if (isNaN(parsedStock) || parsedStock < 0) {
    throw new Error('Invalid stock value');
  }

  // Validate sizes
  let parsedSizes: string[];
  try {
    parsedSizes = JSON.parse(sizes);
    if (!Array.isArray(parsedSizes) || parsedSizes.length === 0) {
      throw new Error('Sizes must be a non-empty array');
    }
  } catch (error) {
    throw new Error('Invalid sizes format');
  }

  return {
    name,
    description,
    price: parsedPrice,
    category,
    subCategory,
    sizes: parsedSizes,
    bestseller: bestseller === 'true',
    images: [], // Will be populated later
    date: new Date(),
    stock: parsedStock,
  };
};

// Helper function to handle image uploads
const handleImages = async (files: ProductFiles | undefined): Promise<string[]> => {
  const images = [
    files?.image1?.[0],
    files?.image2?.[0],
    files?.image3?.[0],
    files?.image4?.[0],
  ].filter((item): item is Express.Multer.File => item !== undefined);

  if (images.length === 0) {
    throw new Error('At least one image is required');
  }

  // Upload images to Cloudinary
  const imagesUrl = await Promise.all(
    images.map(async (item) => {
      const result = await cloudinary.uploader.upload(item.path, { resource_type: 'image' });
      logger.debug('Uploaded image to Cloudinary', { publicId: result.public_id });
      return result.secure_url;
    })
  );

  return imagesUrl;
};

// Helper function to delete images from Cloudinary
const deleteImages = async (images: string[]): Promise<void> => {
  await Promise.all(
    images.map(async (url) => {
      const publicId = url.split('/').pop()?.split('.')[0];
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
        logger.debug('Deleted image from Cloudinary', { publicId });
      }
    })
  );
};

// Add a new product
export const addProduct = async (
  req: Request<{}, {}, ProductRequestBody> & { files?: ProductFiles },
  res: Response
): Promise<void> => {
  try {
    logger.debug('Processing addProduct', { name: req.body.name });

    // Validate inputs
    const productData = validateProductInputs(req.body);

    // Handle image uploads
    productData.images = await handleImages(req.files);

    // Save product
    const product = new productModel(productData);
    await product.save();
    logger.info('Product added successfully', { productId: product._id, name: product.name });

    res.status(201).json({ success: true, message: 'Product added successfully', product });
  } catch (error: any) {
    logger.error('Error in addProduct', { error: error.message });
    res.status(error.message.includes('Invalid') || error.message.includes('required') ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// List products with filters and pagination
export const listProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, subCategory, minPrice, maxPrice, minRating, inStock, search, sort, page = '1', limit = '50' } = req.query;
    logger.debug('Processing listProduct', { query: req.query });

    const query: any = {};

    // Handle category and subcategory filters
    if (category) {
      const categories = String(category).split(',').filter(Boolean);
      if (categories.length > 0) {
        query.category = { $in: categories };
      }
    }
    if (subCategory) {
      const subCategories = String(subCategory).split(',').filter(Boolean);
      if (subCategories.length > 0) {
        query.subCategory = { $in: subCategories };
      }
    }

    // Handle price range
    if (minPrice || maxPrice) {
      query.price = {};
      const min = Number(minPrice);
      const max = Number(maxPrice);
      if (minPrice && !isNaN(min) && min >= 0) {
        query.price.$gte = min;
      }
      if (maxPrice && !isNaN(max) && max > 0) {
        query.price.$lte = max;
      }
    }

    // Handle minimum rating
    if (minRating) {
      const minR = Number(minRating);
      if (!isNaN(minR) && minR >= 0 && minR <= 5) {
        query.averageRating = { $gte: minR };
      }
    }

    // Handle stock filter
    if (inStock === 'true') {
      query.stock = { $gt: 0 };
    }

    // Handle search
    if (search && String(search).trim()) {
      query.$or = [
        { name: { $regex: String(search).trim(), $options: 'i' } },
        { description: { $regex: String(search).trim(), $options: 'i' } },
      ];
    }

    // Validate pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1) {
      throw new Error('Invalid page or limit');
    }
    const skip = (pageNum - 1) * limitNum;

    // Handle sorting
    let sortOptions: { [key: string]: 1 | -1 } = { _id: 1 }; // Default to natural order (insertion order)
    if (sort && String(sort).includes(':')) {
      const [sortField, sortOrder] = String(sort).split(':');
      if (['price', 'averageRating', 'date'].includes(sortField)) {
        sortOptions = { [sortField]: sortOrder === 'desc' ? -1 : 1 };
      }
    }

    // Fetch products
    const products = await productModel
      .find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();
    const total = await productModel.countDocuments(query);

    logger.info('Fetched products', {
      query,
      sortOptions,
      productCount: products.length,
      total,
      page: pageNum,
      limit: limitNum,
    });

    res.json({
      success: true,
      products,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    logger.error('Error in listProduct', { error: error.message, query: req.query });
    res.status(error.message.includes('Invalid') ? 400 : 500).json({
      success: false,
      message: `Server error while fetching products: ${error.message}`,
    });
  }
};

// Remove a product
export const removeProduct = async (req: Request<{}, {}, { id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.body;
    logger.debug('Processing removeProduct', { productId: id });

    // Validate product
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid productId');
    }
    const product = await productModel.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }

    // Delete images from Cloudinary
    await deleteImages(product.images);

    // Delete product
    await productModel.findByIdAndDelete(id);
    logger.info('Product removed successfully', { productId: id });

    res.json({ success: true, message: 'Product removed successfully' });
  } catch (error: any) {
    logger.error('Error in removeProduct', { error: error.message });
    res.status(error.message.includes('Invalid') || error.message.includes('not found') ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Fetch a single product
export const singleProduct = async (req: Request<{ productId: string }>, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    logger.debug('Processing singleProduct', { productId });

    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }

    // Fetch product
    const product = await productModel.findById(productId).lean();
    if (!product) {
      throw new Error('Product not found');
    }

    logger.info('Fetched single product', { productId });
    res.json({ success: true, product });
  } catch (error: any) {
    logger.error('Error in singleProduct', { error: error.message });
    res.status(error.message.includes('Invalid') || error.message.includes('not found') ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Fetch product ratings
export const getProductRatings = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    logger.debug('Processing getProductRatings', { productId: id });

    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid productId');
    }

    // Fetch product with reviews
    const product = await productModel.findById(id).populate('reviews.userId', 'name');
    if (!product) {
      throw new Error('Product not found');
    }

    // Calculate and update average rating
    const averageRating = product.reviews.length
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
      : 0;
    await productModel.findByIdAndUpdate(id, { averageRating });
    logger.info('Fetched product ratings', { productId: id, averageRating, reviewCount: product.reviews.length });

    res.json({ success: true, averageRating, reviews: product.reviews });
  } catch (error: any) {
    logger.error('Error in getProductRatings', { error: error.message });
    res.status(error.message.includes('Invalid') || error.message.includes('not found') ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Add a product review
export const addProductReview = async (req: Request<{}, {}, ReviewRequestBody>, res: Response): Promise<void> => {
  try {
    const { productId, userId, rating, comment } = req.body;
    logger.debug('Processing addProductReview', { productId, userId, rating });

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid productId or userId');
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error('Rating must be an integer between 1 and 5');
    }
    if (!comment || comment.trim().length === 0) {
      throw new Error('Comment cannot be empty');
    }

    // Validate product
    const product = await productModel.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Check if user has purchased and received the product
    const order = await orderModel.findOne({
      userId,
      'items.productId': productId,
      status: 'Delivered',
    });
    if (!order) {
      throw new Error('You can only review products you have purchased and received');
    }

    // Check for existing review
    if (product.reviews.some(review => review.userId.toString() === userId)) {
      throw new Error('You have already reviewed this product');
    }

    // Add review
    const newReview = {
      userId: new mongoose.Types.ObjectId(userId),
      rating,
      comment,
      createdAt: new Date(),
    };
    product.reviews.push(newReview);
    product.ratings = product.reviews.length;
    product.averageRating = product.reviews.length
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
      : 0;

    await product.save();
    logger.info('Review added successfully', { productId, userId, rating });

    res.status(201).json({ success: true, message: 'Review added successfully' });
  } catch (error: any) {
    logger.error('Error in addProductReview', { error: error.message });
    res.status(error.message.includes('Invalid') || error.message.includes('not found') || error.message.includes('already') ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update a product
export const updateProduct = async (
  req: Request<{ productId: string }, {}, ProductRequestBody> & { files?: ProductFiles },
  res: Response
): Promise<void> => {
  try {
    const { productId } = req.params;
    logger.debug('Processing updateProduct', { productId });

    // Validate product
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid productId');
    }
    const product = await productModel.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Validate inputs
    const productData = validateProductInputs(req.body);

    // Update fields if provided
    product.name = productData.name;
    product.description = productData.description;
    product.price = productData.price;
    product.category = productData.category;
    product.subCategory = productData.subCategory;
    product.sizes = productData.sizes;
    product.bestseller = productData.bestseller;
    product.stock = productData.stock;

    // Handle image updates only if new images are provided
    if (req.files && Object.keys(req.files).length > 0) {
      const newImages = await handleImages(req.files);
      if (newImages.length > 0) {
        await deleteImages(product.images);
        product.images = newImages;
      }
    }

    await product.save();
    logger.info('Product updated successfully', { productId });

    res.json({ success: true, message: 'Product updated successfully', product });
  } catch (error: any) {
    logger.error('Error in updateProduct', { error: error.message, stack: error.stack });
    res.status(error.message.includes('Invalid') || error.message.includes('not found') || error.message.includes('required') ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Fetch categories and subcategories
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.debug('Processing getCategories');

    // Fetch and sort categories
    const categories = await productModel.distinct('category').lean();
    const subCategories = await productModel.distinct('subCategory').lean();
    categories.sort();
    subCategories.sort();

    logger.info('Fetched categories and subCategories', {
      categoryCount: categories.length,
      subCategoryCount: subCategories.length,
    });

    res.json({ success: true, categories, subCategories });
  } catch (error: any) {
    logger.error('Error in getCategories', { error: error.message });
    res.status(500).json({ success: false, message: `Server error while fetching categories: ${error.message}` });
  }
};