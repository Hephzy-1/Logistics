import { Request, Response, NextFunction } from 'express';

// Define a custom interface that extends Express's Response and adds custom properties/methods
interface ExtendedResponse extends Response {
  sendResponse?: (
    statusCode?: number,
    message?: string,
    data?: any
  ) => void;
}

export class AppResponse {
  statusCode: number;
  message: string;
  data?: any;

  constructor(statusCode: number, message: string, data?: any) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }
}

function AppResponseHandler(req: Request, res: Response, next: NextFunction) {
  // Attach a custom `sendResponse` method to the `res` object
  res.sendResponse = (statusCode: number, message: string, data?: any) => {
    res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  };

  next(); // Pass control to the next middleware or route handler
}

export default AppResponseHandler;
