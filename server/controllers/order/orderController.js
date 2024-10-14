import crypto from 'crypto';
import mongoose from 'mongoose';
import Order from '../../models/orderModel.js'
import Product from '../../models/ProductModel.js';
import { razorpay } from '../../index.js';
import User from '../../models/userModel.js';
import dotenv from 'dotenv';

dotenv.config();


// Create Order
export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, products, totalPrice, basePrice } = req.body;
      //console.log(userId);
      
    // Step 1: Fetch the user's address
    const user = await User.findById(userId);
    if (!user || !user.addresses || user.addresses.length === 0) {
      throw new Error('User address not found');
    }

    const deliveryAddress = user.addresses[0]; // Use the single stored address

    // Step 2: Create Razorpay Order
    const options = {
      amount: totalPrice * 100, // Convert to paise
      currency: 'INR',
      receipt: `receipt_${Math.random().toString(36).substring(2)}`,
    };
    const razorpayOrder = await razorpay.orders.create(options);

    // Step 3: Decrement Stock for Each Product
    for (const item of products) {
      const product = await Product.findById(item.product).session(session);
      if (!product || product.stock < item.quantity) {
        throw new Error('Insufficient stock for one or more products');
      }
      product.stock -= item.quantity;
      await product.save({ session });
    }

    // Step 4: Create Order in Database
    const order = new Order({
      user: userId,
      basePrice,
      products,
      totalPrice,
      paymentStatus: 'Pending',
      razorpayOrderId: razorpayOrder.id,
      deliveryAddress,
    });
    await order.save({ session });

     // Step 5: Update the user with the order ID
     await User.findByIdAndUpdate(
      userId,
      { $push: { orders: order._id } },
      { new: true, session } // pass session here
    );

    // Step 6: Commit Transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ orderId: order._id, razorpayOrderId: razorpayOrder.id });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

// Handle Payment Success
export const verifyPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const order = await Order.findOne({ razorpayOrderId }).session(session);
    if (!order) {
      throw new Error('Order not found');
    }

    // Verify Razorpay Signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if ( "generatedFakeSignature" !== razorpaySignature) {
      order.paymentStatus = 'Failed';
      await order.save({ session });
      await session.commitTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    order.paymentStatus = 'Paid';
    order.razorpayPaymentId = razorpayPaymentId;
    order.razorpaySignature = razorpaySignature;
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'Payment successful', order });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

// Handle Payment Failure
export const paymentFailure = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { razorpayOrderId } = req.body;

    const order = await Order.findOne({ razorpayOrderId }).session(session);
    if (!order) {
      throw new Error('Order not found');
    }

    order.paymentStatus = 'Failed';
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'Payment failed', order });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};
