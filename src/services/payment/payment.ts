import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import environment from '../../config/env';
import { ErrorResponse } from '../../utils/errorResponse';
import { AppResponse } from '../../middlewares/appResponse';
import asyncHandler from '../../middlewares/async';
import axios from 'axios';
import { CustomerUsecases } from '../../usecases/customer';
import { VendorUsecases } from '../../usecases/vendor';
import { RiderUsecases } from '../../usecases/rider';

const PAYSTACK_SECRET_KEY = environment.PAYSTACK_SECRET;

if (!PAYSTACK_SECRET_KEY) throw new ErrorResponse('Paystack secret is required', 500);

export const initializePayment = async (
  email: string,
  amount: number,
  userId: string,
  userType: 'customer' | 'vendor' | 'rider',
  transactionId: string
) => {
  const response = await axios.post(
    'https://api.paystack.co/transaction/initialize',
    {
      email,
      amount: amount * 100,
      metadata: {
        userId,
        userType,
        transactionId
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
  transactionId: string
) => {

  try {

    const transactValues: any = {
      status: 'completed',
      id: transactionId,
      [`${userType}Id`]: userId
    }

    if (userType == 'customer') {
      console.log(transactValues)
      const transaction = await CustomerUsecases.updateTransactionStatus(transactValues);
      console.log(transaction)

      let wallet = await CustomerUsecases.customerWallet(userId)

      if (!wallet) {
        throw new ErrorResponse('No wallet found', 404);
      }

      wallet.balance += amount;

      await wallet.save();

      return { transaction, wallet};
    } else if (userType == 'vendor') {
      const transaction = await VendorUsecases.updateTransactionStatus(transactValues);
      console.log(transaction)

      let wallet = await VendorUsecases.vendorWallet(userId)

      if (!wallet) {
        throw new ErrorResponse('No wallet found', 404);
      }

      wallet.balance += amount;

      await wallet.save();

      return { transaction, wallet};
    } else if (userType == 'rider') {
      const transaction = await RiderUsecases.updateTransactionStatus(transactValues);
      console.log(transaction)

      let wallet = await RiderUsecases.riderWallet(userId)

      if (!wallet) {
        throw new ErrorResponse('No wallet found', 404);
      }

      wallet.balance += amount;

      await wallet.save();

      return { transaction, wallet};
    } 

  } catch (error) {
    console.error(error)
    throw new ErrorResponse('Error updating transaction', 500);
  }
};

const updateTransaction = async (
  userType: 'customer' | 'vendor' | 'rider',
  transactionId: string
) => {

  try {

    const transactValues: any = {
      status: 'failed',
      id: transactionId
    }

    if (userType == 'customer') {
      console.log(transactValues)
      const transaction = await CustomerUsecases.updateTransactionStatus(transactValues);
      console.log(transaction)

      return transaction;
    } else if (userType == 'vendor') {
      const transaction = await VendorUsecases.updateTransactionStatus(transactValues);
      console.log(transaction)

      return transaction;
    } else if (userType == 'rider') {
      const transaction = await RiderUsecases.updateTransactionStatus(transactValues);
      console.log(transaction)

      return transaction;
    } 

  } catch (error) {
    console.error(error)
    throw new ErrorResponse('Error updating transaction', 500);
  }
};

export const webhook = asyncHandler(async (req: Request, res: Response) => {
  
  const signature = req.headers['x-paystack-signature'];

  const secret = PAYSTACK_SECRET_KEY;
  const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');

 if (hash !== req.headers['x-paystack-signature']) {
    throw new ErrorResponse('Webhook signature required', 500)
  }
    
  const payload = req.body;

    if (payload.event == 'charge.success' ) {
      const { reference, status: paymentStatus, id: transactionId, metadata, amount } = payload.data;
      const actualAmount = amount / 100;

      const transaction = await updateWalletAndCreateTransaction(
        metadata.userId,
        metadata.userType,
        actualAmount,
        transactionId
      );

      console.log('Payment successful')
      return AppResponse(
        res,
        200,
        { transactionId, reference, paymentStatus, transactionDetails: transaction },
        'Payment successful and wallet updated'
      );
  } else {
    const { status: paymentStatus, id: transactionId, metadata } = payload.data;
    const transaction = await updateTransaction(
      metadata.userType,
      transactionId
    )

    console.error(`Event not handled. Transaction failed ${transaction}`);
    throw new ErrorResponse(`Event not handled. Transaction failed ${transaction}. Status: ${paymentStatus}`, 400);
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