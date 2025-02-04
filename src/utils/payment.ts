import axios from 'axios';
import { ErrorResponse } from './errorResponse';
import environment from '../config/env';

const PAYSTACK_SECRET_KEY = environment.PAYSTACK_SECRET;

interface PaymentData {
  email: string;
  amount: number;
  callback_url: string;
}

export const initializePayment = async (paymentData: PaymentData) => {
  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      paymentData,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(response)
    return response.data;
  } catch (error: any) {
    throw new ErrorResponse(`Payment initialization failed: ${error.message}`, 500);
  }
};

export const verifyPayment = async (reference: string) => {
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(response)
    return response.data;
  } catch (error: any) {
    throw new ErrorResponse(`Payment verification failed: ${error.message}`, 500);
  }
};