import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import environment from '../config/env';
import { ErrorResponse } from './errorResponse';
import axios from 'axios';
import { AppResponse } from '../middlewares/appResponse';

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

const verifyPaystackWebhook = (eventData: any, signature: string) => {
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(eventData))
    .digest('hex');

  return hash === signature;
};

export const webhook = async (req: Request, res: Response) => {
  const event = req.body;
  const signature = req.headers['x-paystack-signature'];

  if (!verifyPaystackWebhook(event, signature as string)) {
    throw new ErrorResponse('Webhook signature verification failed', 400);
  }
  
  switch (event.event) {
    case 'charge.success':
      const transactionRef = event.data.reference;
      const paymentStatus = event.data.status;
      const transactionId = event.data.id;

      
      AppResponse(res, 200, { transactionId, transactionRef, paymentStatus }, 'Payment successful');
    default:
      new ErrorResponse('Event not handled', 400);
      break;
  }
};