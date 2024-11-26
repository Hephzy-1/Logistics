import Joi from "joi";

export const registerUser = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).message('Password must be at least 6 characters').required(),
  phoneNumber: Joi.string().required(),
  role: Joi.string().valid('customer', 'vendor', 'rider')
});

export const loginUser = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const verifyOTPInput = Joi.object({
  otp: Joi.number().required()
})