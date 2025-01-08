import bcrypt from 'bcrypt';

export const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, 10)
};

export const comparePassword = async(password: string, userPassword: string) => {
  return await bcrypt.compare(password, userPassword)
};

export const hashToken = async (token: string) => {
  return await bcrypt.hash(token, 5);
}

export const compareToken = async (token: string, hashedToken: string) => {
  return await bcrypt.compare(token, hashedToken);
}