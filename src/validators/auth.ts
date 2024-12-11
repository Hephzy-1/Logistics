import Joi from "joi";

export const registerUser = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).message('Password must be at least 6 characters').required(),
  phoneNumber: Joi.string().required()
});

export const loginUser = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const verifyOTPInput = Joi.object({
  otp: Joi.number().required()
});

export const resetLink = Joi.object({
  email: Joi.string().email().required()
});

export const resetPass = Joi.object({
  newPassword: Joi.string().required(),
  confirmPassword: Joi.string().required()
});

export const updatePass = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().required(),
  confirmPassword: Joi.string().required()
});