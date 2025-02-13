import nodemailer from 'nodemailer';
import environment from '../../config/env';
import { ErrorResponse } from '../../utils/errorResponse';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: environment.EMAIL,
    pass: environment.EMAIL_PASS
  }
});

export const sendOTP = async (otp:string, email:string) => {
  const mailOptions = {
    from: 'Hephzy',
    to: email,
    subject: 'OTP for Verification',
    text: `Your OTP is: ${otp}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      throw new ErrorResponse('Email not sent', 500);
    } else {
      console.log('Email sent' + info.response);
      return info.response;
    }
  });
};

export const sendResetLink = async (token: string, email: string, role:string) => {
  const mailOptions = {
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

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      throw new ErrorResponse('Email not sent', 500);
    } else {
      console.log('Email sent' + info.response);
      return info.response;
    }
  });
}