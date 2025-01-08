import Joi from "joi";

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
  id: Joi.string().required(),
  newPassword: Joi.string().required(),
  confirmPassword: Joi.string().required()
});

export const updatePass = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().required(),
  confirmPassword: Joi.string().required()
});