import { Request, Response } from 'express';
import mongoose, { SortOrder } from 'mongoose';
import orderModel, { Order } from '../models/orderModel';
import userModel from '../models/userModel';
import productModel from '../models/productModel';
import Stripe from 'stripe';
import logger from '../utils/logger';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-03-31.basil',
});

// Constants
const CURRENCY = 'EGP';
const DELIVERY_CHARGES = 50;

// Interfaces
interface CartData {
  [productId: string]: { [size: string]: number };
}

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  size?: string;
}

interface OrderRequestBody {
  userId: string;
  items: OrderItem[];
  amount: number;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

interface VerifyRequestBody {
  orderId: string;
  sessionId: string;
  userId: string;
}

// Helper function to validate user and order items
const validateOrderData = async (userId: string, items: OrderItem[]): Promise<{
  user: any;
  itemsWithProductIds: any[];
  calculatedAmount: number;
}> => {
  // Validate userId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid userId');
  }
  const user = await userModel.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Fetch all products in one query
  const productNames = items.map(item => item.name);
  const products = await productModel.find({ name: { $in: productNames } });
  const productMap = new Map(products.map(p => [p.name, p]));

  // Validate items, stock, and prices
  let calculatedAmount = 0;
  const itemsWithProductIds = items.map(item => {
    const product = productMap.get(item.name);
    if (!product) {
      throw new Error(`Product ${item.name} not found`);
    }
    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${item.name}`);
    }
    if (product.price !== item.price) {
      throw new Error(`Invalid price for ${item.name}`);
    }
    if (item.size && !product.sizes.includes(item.size)) {
      throw new Error(`Invalid size ${item.size} for ${item.name}`);
    }
    calculatedAmount += product.price * item.quantity;
    return {
      productId: product._id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      size: item.size,
    };
  });

  return { user, itemsWithProductIds, calculatedAmount };
};

// Place order with Cash on Delivery
export const placeOrder = async (req: Request<{}, {}, OrderRequestBody>, res: Response): Promise<void> => {
  try {
    const { userId, items, amount, address } = req.body;
    logger.debug('Processing placeOrder', { userId, itemCount: items.length, amount });

    // Validate order data
    const { user, itemsWithProductIds, calculatedAmount } = await validateOrderData(userId, items);

    // Validate total amount
    if (calculatedAmount + DELIVERY_CHARGES !== amount) {
      logger.warn('Invalid total amount', { calculated: calculatedAmount + DELIVERY_CHARGES, provided: amount });
      throw new Error('Invalid total amount');
    }

    // Create order
    const orderData = {
      userId,
      items: itemsWithProductIds,
      totalAmount: amount,
      address,
      paymentMethod: 'COD',
      payment: false,
      date: Date.now(),
      status: 'Order Placed',
    };
    const newOrder = new orderModel(orderData);
    await newOrder.save();
    logger.info('Order created successfully', { orderId: newOrder._id, userId });

    // Update product stock
    for (const item of itemsWithProductIds) {
      await productModel.updateOne({ _id: item.productId }, { $inc: { stock: -item.quantity } });
      logger.debug('Updated product stock', { productId: item.productId, quantity: item.quantity });
    }

    // Clear user cart
    await userModel.findByIdAndUpdate(userId, { cartData: {} });
    logger.debug('Cleared user cart', { userId });

    res.json({ success: true, message: 'Order Placed Successfully' });
  } catch (error: any) {
    logger.error('Error in placeOrder', { error: error.message });
    res.status(error.message.includes('Invalid') || error.message.includes('not found') ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Place order with Stripe payment
export const placeOrderStripe = async (req: Request<{}, {}, OrderRequestBody>, res: Response): Promise<void> => {
  try {
    const { userId, items, amount, address } = req.body;
    let { origin } = req.headers;
    if (!origin) {
      if (!process.env.FRONTEND_URL) {
        throw new Error('FRONTEND_URL is not defined');
      }
      origin = process.env.FRONTEND_URL;
    } else if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
      origin = `https://${origin}`;
    }
    logger.debug('Processing placeOrderStripe', { userId, itemCount: items.length, amount, origin });

    // Validate STRIPE_SECRET_KEY
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not defined');
    }

    // Validate order data
    const { itemsWithProductIds, calculatedAmount } = await validateOrderData(userId, items);

    // Validate total amount
    if (calculatedAmount + DELIVERY_CHARGES !== amount) {
      logger.warn('Invalid total amount', { calculated: calculatedAmount + DELIVERY_CHARGES, provided: amount });
      throw new Error('Invalid total amount');
    }

    // Create order
    const orderData = {
      userId,
      items: itemsWithProductIds,
      totalAmount: amount,
      address,
      paymentMethod: 'Stripe',
      payment: false,
      date: Date.now(),
      status: 'Order Placed',
    };
    const newOrder = new orderModel(orderData);
    await newOrder.save();
    logger.info('Stripe order created', { orderId: newOrder._id, userId });

    // Create Stripe checkout session
    const line_items = itemsWithProductIds.map(item => ({
      price_data: {
        currency: CURRENCY,
        product_data: { name: item.name },
        unit_amount: item.price * 100,
      },
      quantity: item.quantity,
    }));
    line_items.push({
      price_data: {
        currency: CURRENCY,
        product_data: { name: 'Delivery Charges' },
        unit_amount: DELIVERY_CHARGES * 100,
      },
      quantity: 1,
    });

    const session = await stripe.checkout.sessions.create({
      success_url: `${origin}/verify?orderId=${newOrder._id}&sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/verify?orderId=${newOrder._id}&sessionId={CHECKOUT_SESSION_ID}`,
      line_items,
      mode: 'payment',
    });

    logger.info('Stripe checkout session created', { sessionId: session.id, orderId: newOrder._id });
    res.json({ success: true, session_url: session.url, session_id: session.id, orderId: newOrder._id });
  } catch (error: any) {
    logger.error('Error in placeOrderStripe', { error: error.message });
    res.status(error.message.includes('Invalid') || error.message.includes('not found') ? 400 : 500).json({
      success: false,
      message: `Stripe error: ${error.message}`,
    });
  }
};

// Verify Stripe payment
export const verifyStripe = async (req: Request<{}, {}, VerifyRequestBody>, res: Response): Promise<void> => {
  try {
    const { orderId, sessionId, userId } = req.body;
    logger.debug('Processing verifyStripe', { orderId, sessionId, userId });

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid orderId or userId');
    }

    // Fetch order
    const order = await orderModel.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Fetch Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      throw new Error('Stripe session not found');
    }

    // Process payment
    if (session.payment_status === 'paid') {
      for (const item of order.items) {
        await productModel.updateOne({ _id: item.productId }, { $inc: { stock: -item.quantity } });
        logger.debug('Updated product stock for Stripe payment', { productId: item.productId, quantity: item.quantity });
      }
      await orderModel.findByIdAndUpdate(orderId, { payment: true });
      await userModel.findByIdAndUpdate(userId, { cartData: {} });
      logger.info('Stripe payment verified successfully', { orderId, userId, sessionId });
      res.json({ success: true, message: 'Payment Successful' });
    } else {
      await orderModel.findByIdAndDelete(orderId);
      logger.info('Stripe payment failed or cancelled, order deleted', { orderId, sessionId });
      res.json({ success: false, message: 'Payment failed or cancelled' });
    }
  } catch (error: any) {
    logger.error('Error in verifyStripe', { error: error.message });
    res.status(error.message.includes('Invalid') || error.message.includes('not found') ? 400 : 500).json({
      success: false,
      message: `Error: ${error.message}`,
    });
  }
};

// Fetch all orders with pagination
export const allOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.debug('Fetching all orders');
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const sortParam = req.body.sort || 'date-desc';

    // Validate sort parameter
    if (!['date-desc', 'date-asc'].includes(sortParam)) {
      throw new Error('Invalid sort parameter');
    }

    // Define sort order
    const sortOrder: { [key: string]: SortOrder } = {
      date: sortParam === 'date-desc' ? -1 : 1,
    };

    // Fetch orders
    let orders: Order[] = await orderModel
      .find({})
      .populate('userId', 'name email')
      .populate('items.productId', 'name images')
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    // Filter out items with null productId
    orders = orders.map(order => ({
      ...order.toObject(),
      items: order.items.filter(item => item.productId !== null),
    }));

    const totalOrders = await orderModel.countDocuments();
    logger.info('Fetched all orders', { orderCount: orders.length, page, limit, sort: sortParam });

    res.json({
      success: true,
      orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders,
        ordersPerPage: limit,
      },
    });
  } catch (error: any) {
    logger.error('Error in allOrders', { error: error.message });
    res.status(error.message.includes('Invalid') ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Fetch user-specific orders with pagination
export const userOrders = async (req: Request<{}, {}, { userId: string }, { page?: string; limit?: string }>, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const skip = (page - 1) * limit;
    logger.debug('Fetching user orders', { userId, page, limit, skip });

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid userId');
    }

    // Fetch orders
    const totalOrders = await orderModel.countDocuments({ userId });
    let orders: Order[] = await orderModel
      .find({ userId })
      .populate('items.productId', 'name images')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    // Filter out items with null productId
    orders = orders.map(order => ({
      ...order.toObject(),
      items: order.items.filter(item => item.productId !== null),
    }));

    logger.info('Fetched user orders', { userId, orderCount: orders.length, totalOrders, page, limit });

    res.json({
      success: true,
      orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders,
        ordersPerPage: limit,
      },
    });
  } catch (error: any) {
    logger.error('Error in userOrders', { error: error.message });
    res.status(error.message.includes('Invalid') ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update order status
export const updateOrderStatus = async (req: Request<{}, {}, { orderId: string; status: string }>, res: Response): Promise<void> => {
  try {
    const { orderId, status } = req.body;
    logger.debug('Updating order status', { orderId, status });

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new Error('Invalid orderId');
    }
    const validStatuses = ['Order Placed', 'Pending', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    // Update order status
    await orderModel.findByIdAndUpdate(orderId, { status });
    logger.info('Order status updated', { orderId, status });

    res.json({ success: true, message: 'Status Updated Successfully' });
  } catch (error: any) {
    logger.error('Error in updateOrderStatus', { error: error.message });
    res.status(error.message.includes('Invalid') ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Generate order summary from cart
export const getOrderSummary = async (req: Request<{}, {}, { userId: string }>, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;
    logger.debug('Fetching order summary', { userId });

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid userId');
    }
    const user = await userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Fetch cart data
    const cartData: CartData = user.cartData;
    let totalAmount = 0;
    const items: OrderItem[] = [];

    // Validate cart items
    for (const productId in cartData) {
      const product = await productModel.findById(productId);
      if (!product) {
        logger.warn('Product not found in cart', { productId });
        continue;
      }
      const sizes = cartData[productId];
      for (const size in sizes) {
        if (!product.sizes.includes(size)) {
          throw new Error(`Invalid size ${size} for ${product.name}`);
        }
        const quantity = sizes[size];
        if (product.stock < quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
        const itemTotal = product.price * quantity;
        totalAmount += itemTotal;
        items.push({
          name: product.name,
          price: product.price,
          quantity,
          size,
        });
      }
    }

    totalAmount += DELIVERY_CHARGES;
    logger.info('Order summary generated', { userId, itemCount: items.length, totalAmount });

    res.json({ success: true, items, totalAmount });
  } catch (error: any) {
    logger.error('Error in getOrderSummary', { error: error.message });
    res.status(error.message.includes('Invalid') || error.message.includes('not found') ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
};