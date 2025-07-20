import { Request, Response } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import userModel, { User } from '../models/userModel';
import productModel from '../models/productModel';
import logger from '../utils/logger';

// Define interfaces
interface CartItem {
  [size: string]: number;
}

interface CartData {
  [id: string]: CartItem;
}

interface CartRequestBody {
  id: string;
  size: string;
  quantity?: number;
}

interface AuthRequest extends Request {
  user?: { id: string };
}

interface JwtPayload {
  id: string;
}

// Helper function to extract userId from JWT token
const getUserIdFromToken = async (authHeader: string | undefined): Promise<string | null> => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  try {
    const token = authHeader.replace('Bearer ', '');
    if (!process.env.JWT_SECRET_KEY) {
      throw new Error('JWT_SECRET_KEY is not defined');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY) as JwtPayload;
    const user = await userModel.findById(decoded.id);
    if (!user) {
      logger.warn('User not found for token', { tokenId: decoded.id });
      return null;
    }
    return decoded.id;
  } catch (error: any) {
    logger.error('Token verification failed', { error: error.message });
    return null;
  }
};

// Helper function to get cart data (from user or cookies)
const getCartData = async (userId: string | null, req: Request): Promise<CartData> => {
  let cartData: CartData = {};

  if (!userId) {
    // Fetch cart from cookies for unauthenticated users
    try {
      cartData = req.cookies?.cartData ? JSON.parse(req.cookies.cartData) : {};
      logger.debug('Parsed cookie cartData', { cartData });
    } catch (error) {
      logger.error('Error parsing cartData cookie', { error });
      return {};
    }
  } else {
    // Validate userId and fetch cart from database
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid userId');
    }
    const user = await userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    cartData = user.cartData || {};
    logger.debug('Fetched user cartData', { userId, cartData });
  }

  return cartData;
};

// Helper function to save cart data
const saveCartData = async (userId: string | null, cartData: CartData, res: Response): Promise<void> => {
  if (userId) {
    // Save cart to user in database
    await userModel.findByIdAndUpdate(userId, { cartData });
    logger.info('Cart saved to user', { userId });
  } else {
    // Save cart to cookies
    res.cookie('cartData', JSON.stringify(cartData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
    logger.info('Cart saved to cookie');
  }
};

// Validate product and size
const validateProductAndSize = async (id: string, size: string): Promise<any> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid productId');
  }
  const product = await productModel.findById(id);
  if (!product) {
    throw new Error('Product not found');
  }
  if (!product.sizes.includes(size)) {
    throw new Error(`Size ${size} is not available for this product`);
  }
  return product;
};

// Add item to cart
export const addToCart = async (req: AuthRequest & Request<{}, {}, CartRequestBody>, res: Response): Promise<void> => {
  try {
    const { id, size, quantity = 1 } = req.body;
    const userId = req.user?.id || (await getUserIdFromToken(req.headers.authorization));
    logger.debug('Processing addToCart', { productId: id, size, quantity, userId });

    // Validate inputs
    if (!id || !size || quantity < 1) {
      throw new Error('id, size, and quantity are required and must be valid');
    }

    // Validate product and size
    const product = await validateProductAndSize(id, size);

    // Check stock availability
    if (product.stock < quantity) {
      throw new Error(`Insufficient stock. Available: ${product.stock}`);
    }

    // Get existing cart data
    const cartData = await getCartData(userId, req);

    // Update cart data
    if (cartData[id]) {
      if (cartData[id][size]) {
        const newQuantity = cartData[id][size] + quantity;
        if (product.stock < newQuantity) {
          throw new Error(`Insufficient stock. Available: ${product.stock}`);
        }
        cartData[id][size] = newQuantity;
      } else {
        cartData[id][size] = quantity;
      }
    } else {
      cartData[id] = { [size]: quantity };
    }

    // Save updated cart
    await saveCartData(userId, cartData, res);
    logger.info('Cart updated', { userId, productId: id, size, quantity });

    res.json({ success: true, message: 'Added to cart', cartData });
  } catch (error: any) {
    logger.error('Error in addToCart', { error: error.message });
    res.status(error.message.includes('Invalid') || error.message.includes('not found') ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update item in cart
export const updateCart = async (req: AuthRequest & Request<{}, {}, CartRequestBody>, res: Response): Promise<void> => {
  try {
    const { id, size, quantity } = req.body;
    const userId = req.user?.id || (await getUserIdFromToken(req.headers.authorization));
    logger.debug('Processing updateCart', { productId: id, size, quantity, userId });

    // Validate inputs
    if (!id || !size || quantity === undefined || quantity < 0) {
      throw new Error('id, size, and quantity are required and must be valid');
    }

    // Validate product and size
    const product = await validateProductAndSize(id, size);

    // Get existing cart data
    const cartData = await getCartData(userId, req);

    // Check if item exists in cart
    if (!cartData[id] || !cartData[id][size]) {
      throw new Error('Item not found in cart');
    }

    // Update cart data
    if (quantity === 0) {
      delete cartData[id][size];
      if (Object.keys(cartData[id]).length === 0) {
        delete cartData[id];
      }
    } else {
      if (product.stock < quantity) {
        throw new Error(`Insufficient stock. Available: ${product.stock}`);
      }
      cartData[id][size] = quantity;
    }

    // Save updated cart
    await saveCartData(userId, cartData, res);
    logger.info('Cart updated', { userId, productId: id, size, quantity });

    res.json({ success: true, message: 'Cart updated', cartData });
  } catch (error: any) {
    logger.error('Error in updateCart', { error: error.message });
    res.status(error.message.includes('Invalid') || error.message.includes('not found') ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get user cart
export const getUserCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || (await getUserIdFromToken(req.headers.authorization));
    logger.debug('Processing getUserCart', { userId });

    // Get cart data
    const cartData = await getCartData(userId, req);

    // Fetch products and calculate totals
    const cartItems: any[] = [];
    let totalCost = 0;
    const productIds = Object.keys(cartData).filter((id) => mongoose.Types.ObjectId.isValid(id));
    const products = await productModel.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    for (const productId in cartData) {
      const product = productMap.get(productId);
      if (product) {
        const sizes = cartData[productId];
        for (const size in sizes) {
          if (product.sizes.includes(size)) {
            const quantity = sizes[size];
            const itemTotal = product.price * quantity;
            totalCost += itemTotal;
            cartItems.push({
              productId,
              name: product.name,
              price: product.price,
              size,
              quantity,
              itemTotal,
            });
          }
        }
      }
    }

    logger.info('Fetched user cart', { userId, itemCount: cartItems.length, totalCost });
    res.json({ success: true, cartItems, totalCost });
  } catch (error: any) {
    logger.error('Error in getUserCart', { error: error.message });
    res.status(500).json({ success: false, message: `Server error while fetching cart: ${error.message}` });
  }
};

// Remove item from cart
export const removeFromCart = async (req: AuthRequest & Request<{}, {}, { id: string; size: string }>, res: Response): Promise<void> => {
  try {
    const { id, size } = req.body;
    const userId = req.user?.id || (await getUserIdFromToken(req.headers.authorization));
    logger.debug('Processing removeFromCart', { productId: id, size, userId });

    // Validate inputs
    if (!id || !size) {
      throw new Error('id and size are required');
    }

    // Validate product and size
    await validateProductAndSize(id, size);

    // Get existing cart data
    const cartData = await getCartData(userId, req);

    // Check if item exists in cart
    if (!cartData[id] || !cartData[id][size]) {
      throw new Error('Item not found in cart');
    }

    // Remove item from cart
    delete cartData[id][size];
    if (Object.keys(cartData[id]).length === 0) {
      delete cartData[id];
    }

    // Save updated cart
    await saveCartData(userId, cartData, res);
    logger.info('Item removed from cart', { userId, productId: id, size });

    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error: any) {
    logger.error('Error in removeFromCart', { error: error.message });
    res.status(error.message.includes('Invalid') || error.message.includes('not found') ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Merge cart (from cookies to user)
export const mergeCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || (await getUserIdFromToken(req.headers.authorization));
    logger.debug('Processing mergeCart', { userId });

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid userId');
    }
    const user = await userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    let cartData = user.cartData || {};
    let cookieCart: CartData = req.body.cartData || {};
    const ignoredItems: { productId: string; size: string; reason: string }[] = [];

    for (const productId in cookieCart) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        ignoredItems.push({ productId, size: '', reason: 'Invalid productId' });
        continue;
      }
      const product = await productModel.findById(productId);
      if (!product) {
        ignoredItems.push({ productId, size: '', reason: 'Product not found' });
        continue;
      }
      const sizes = cookieCart[productId];
      for (const size in sizes) {
        if (!product.sizes.includes(size)) {
          ignoredItems.push({ productId, size, reason: 'Invalid size' });
          continue;
        }
        const quantity = sizes[size];
        if (product.stock < quantity) {
          ignoredItems.push({ productId, size, reason: `Insufficient stock (available: ${product.stock})` });
          continue;
        }
        if (cartData[productId]) {
          if (cartData[productId][size]) {
            const totalQuantity = cartData[productId][size] + quantity;
            cartData[productId][size] = Math.min(totalQuantity, product.stock);
          } else {
            cartData[productId][size] = Math.min(quantity, product.stock);
          }
        } else {
          cartData[productId] = { [size]: Math.min(quantity, product.stock) };
        }
      }
    }

    await userModel.findByIdAndUpdate(userId, { cartData });
    res.clearCookie('cartData');
    logger.info('Cart merged successfully', { userId });
    res.json({ success: true, message: 'Cart merged successfully', ignoredItems });
  } catch (error: any) {
    logger.error('Error in mergeCart', { error: error.message });
    res.status(error.message.includes('Invalid') || error.message.includes('not found') ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
};