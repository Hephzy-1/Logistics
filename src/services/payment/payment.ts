import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import environment from '../../config/env';
import { ErrorResponse } from '../../utils/errorResponse';
import { AppResponse } from '../../middlewares/appResponse';
import asyncHandler from '../../middlewares/async';
import axios from 'axios';
import { Customer } from '../../usecases/customer';
import { Vendor } from '../../usecases/vendor';
import { Rider } from '../../usecases/rider';

const PAYSTACK_SECRET_KEY = environment.PAYSTACK_SECRET;

if (!PAYSTACK_SECRET_KEY) throw new ErrorResponse('Paystack secret is required', 500);

export const initializePayment = async (
  email: string,
  amount: number,
  userId: string,
  userType: 'customer' | 'vendor' | 'rider'
) => {
  const response = await axios.post(
    'https://api.paystack.co/transaction/initialize',
    {
      email,
      amount: amount * 100,
      metadata: {
        userId,
        userType
      }
    },
    {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
};

const verifyPaystackWebhook = (eventData: any, signature: string) => {
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(eventData))
    .digest('hex');

  return hash === signature;
};

const updateWalletAndCreateTransaction = async (
  userId: string,
  userType: 'customer' | 'vendor' | 'rider',
  amount: number,
  reference: string
) => {
  try {
    // Find or create wallet
    let wallet = await Customer.customerWallet(userId) || Vendor.vendorWallet(userId) || Rider.riderWallet(userId);

    if (!wallet) {
      throw new ErrorResponse('No wallet found', 404);
    }

    const transactValues: any = {
      amount,
      type: 'credit',
      date: new Date(),
      description: 'Wallet funding',
      status: 'completed',
      reference,
      [`${userType}Id`]: userId
    }

    if (userType === 'customer') {
      const transaction = await Customer.updateTransactionStatus(transactValues);

      return transaction;
    } else if (userType === 'vendor') {
      const transaction = await Vendor.createNewTransaction(transactValues);

      return transaction;
    } else if (userType === 'rider') {
      const transaction = await Rider.createNewTransaction(transactValues);

      return transaction;
    } 

  } catch (error) {
    throw new ErrorResponse('Error updating transaction', 500);
  }
};

export const webhook = asyncHandler(async (req: Request, res: Response) => {
  const event = req.body;
  const signature = req.headers['x-paystack-signature'];

  if (!verifyPaystackWebhook(event, signature as string)) {
    throw new ErrorResponse('Webhook signature verification failed', 400);
  }
  
  switch (event.event) {
    case 'charge.success':
      const {
        reference,
        status: paymentStatus,
        id: transactionId,
        metadata,
        amount
      } = event.data;

      // Get the actual amount (Paystack amount is in kobo/cents)
      const actualAmount = amount / 100;

      // Update wallet and create transaction
      const transaction = await updateWalletAndCreateTransaction(
        metadata.userId,
        metadata.userType,
        actualAmount,
        reference
      );

      return AppResponse(
        res,
        200,
        {
          transactionId,
          reference,
          paymentStatus,
          transactionDetails: transaction
        },
        'Payment successful and wallet updated'
      );

    default:
      throw new ErrorResponse('Event not handled', 400);
  }
});