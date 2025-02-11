import nodemailer, { SendMailOptions, SentMessageInfo } from 'nodemailer';
import environment from '../config/env';
import { ErrorResponse } from './errorResponse';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: environment.EMAIL,
    pass: environment.EMAIL_PASS
  }
});

export const sendOTP = async (otp: string, email: string): Promise<string> => {
  const mailOptions: SendMailOptions = {
    from: 'Hephzy',
    to: email,
    subject: 'OTP for Verification',
    text: `Your OTP is: ${otp}`
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error: Error | null, info: SentMessageInfo) => {
      if (error) {
        console.error(error);
        reject(new ErrorResponse('Email not sent', 500));
      } else {
        console.log('Email sent: ' + info.response);
        resolve(info.response);
      }
    });
  });
};

export const sendResetLink = async (token: string, email: string, role: string): Promise<string> => {
  const mailOptions: SendMailOptions = {
    from: 'Hephzy',
    to: email,
    subject: 'Reset Token Link',
    html: `
      <h2>
        Your reset token link is: 
        <b>http://localhost:${environment.PORT}/api/v1/${role}/reset/${token}</b>
      </h2>
    `
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error: Error | null, info: SentMessageInfo) => {
      if (error) {
        console.error(error);
        reject(new ErrorResponse('Email not sent', 500));
      } else {
        console.log('Email sent: ' + info.response);
        resolve(info.response);
      }
    });
  });
};