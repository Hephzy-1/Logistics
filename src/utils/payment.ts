import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import environment from '../config/env';
import { ErrorResponse } from './errorResponse';
import axios from 'axios';

const PAYSTACK_SECRET_KEY = environment.PAYSTACK_SECRET;

if (!PAYSTACK_SECRET_KEY) throw new ErrorResponse('Paystack secret is required', 500)

interface InitializePaymentResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export const initializePayment = async (
  email: string,
  amount: number
): Promise<InitializePaymentResponse> => {
  const response = await axios.post<InitializePaymentResponse>(
    'https://api.paystack.co/transaction/initialize',
    {
      email,
      amount: amount * 100, 
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

const verifyPaystackWebhook = (req: Request, res: Response, next: NextFunction) => {
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash === req.headers['x-paystack-signature']) {
    next();
  } else {
    res.status(400).send('Invalid signature');
  }
};

const webhook = async (req: Request, res: Response) => {
  const event = req.body;
  
  switch (event.event) {
    case 'charge.success':
      const transactionRef = event.data.reference;
      const paymentStatus = event.data.status;

      // Handle the event (e.g., verify the transaction, update the database)
      // Example: await verifyTransaction(transactionRef);

      // Respond to Paystack to acknowledge receipt of the event
      res.status(200).send('Event received');
      break;

    default:
      res.status(200).send('Event not handled');
      break;
  }
};