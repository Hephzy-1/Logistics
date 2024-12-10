import nodemailer from 'nodemailer';
import environment from '../config/env';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: environment.EMAIL,
    pass: environment.EMAIL_PASS
  }
});

export const sendOTP = (otp:string, email:string) => {
  const mailOptions = {
    from: environment.EMAIL,
    to: email,
    subject: 'OTP for Verification',
    text: `Your OTP is: ${otp}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
};