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

// const verifyPaystackWebhook = (rawBody: string, signature: string) => {
//   const hash = crypto
//     .createHmac('sha512', PAYSTACK_SECRET_KEY)
//     .update(JSON.stringify(rawBody))
//     .digest('hex');

//   return hash === signature;
// };

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
  const rawBody = (req as any).rawBody; 
  const signature = req.headers['x-paystack-signature'];

  const secret = PAYSTACK_SECRET_KEY;
  const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');

 if (hash !== req.headers['x-paystack-signature']) {
    throw new ErrorResponse('Webhook signature required', 500)
  }
    
  const payload = req.body;

  const event = JSON.parse(rawBody)
  console.log({ metadata: payload.data.metadata, payload })

  switch (event.event) {
    case 'charge.success':
      const { reference, status: paymentStatus, id: transactionId, metadata, amount } = event.data;
      const actualAmount = amount / 100;

      const transaction = await updateWalletAndCreateTransaction(
        metadata.userId,
        metadata.userType,
        actualAmount,
        reference
      );

      return AppResponse(
        res,
        200,
        { transactionId, reference, paymentStatus, transactionDetails: transaction },
        'Payment successful and wallet updated'
      );

    default:
      throw new ErrorResponse('Event not handled', 400);
  }
});

// export const handlePaystackCallback = asyncHandler(async (req: Request, res: Response) => {
//   // If you specified a secret hash, check for the signature
// const secret = ENVIRONMENT.PAYSTACK.SECRET_KEY;
// const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');

//  console.log({hash, secret, headers: req.headers})
//  if (hash == req.headers['x-paystack-signature']) {
//      const payload = req.body;
//      if (
//          payload.event === 'charge.success' &&
//          payload.data.status === 'success' &&
//          payload.data.currency === 'NGN'
//      ) {
//          console.log('success in the paystack webhook')
//          console.log({ metadata: payload.data.metadata.custom_fields })
//          // Success! Confirm the customer's payment
//          const bookingId = payload.data.metadata.custom_fields[0].value;
//          console.log({ bookingId })
//          const result = await BookingService.handlewebhook(bookingId);
//          if (result) {
//              return AppResponse(res, 200, null, 'Payment was Successful');
//          }
//      } else {
//          // Inform the customer their payment was unsuccessful
//          return AppResponse(res, 200, null, 'Payment was Unsuccessful');
//      }
//  } else {
//      throw new ErrorResponse('Paystack hash or secret incorrect', 400)
//  }
// });