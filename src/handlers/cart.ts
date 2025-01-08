import asyncHandler from "../middlewares/async";
import { CartRepository } from "../repository/cart";
import { ErrorResponse } from "../utils/errorResponse";
import { AppResponse } from "../middlewares/appResponse";

export const addItemToCart = asyncHandler(async (req, res, next) => {
  const { customerId, vendorId, items } = req.body;

  // Validate required fields
  if (!customerId || !vendorId || !items || items.length === 0) {
    return next(new ErrorResponse("Customer ID, Vendor ID, and items are required.", 400));
  }

  // Find existing cart for the customer and vendor
  let cart = await CartRepository.getCartForCustomerAndVendor(customerId, vendorId);

  if (cart) {
    // Add items to existing cart
    items.forEach((item) => {
      const existingItem = cart.items.find((i) => i.menuItem.toString() === item.menuItem);
      if (existingItem) {
        existingItem.quantity += item.quantity;
      } else {
        cart.items.push(item);
      }
    });
    cart = await cart.save();
  } else {
    // Create a new cart
    cart = await CartRepository.createCart({ customerId, vendorId, items, totalPrice: 0 });
  }

  return AppResponse(res, 200, cart, "Item(s) added to cart successfully");
});

export const clearCart = asyncHandler(async (req, res, next) => {
  const { customerId } = req.params;

  if (!customerId) {
    return next(new ErrorResponse("Customer ID is required.", 400));
  }

  // Clear the cart
  const result = await CartRepository.clearCartForCustomer(customerId);

  if (!result) {
    return next(new ErrorResponse("Failed to clear cart.", 500));
  }

  return AppResponse(res, 200, null, "Cart cleared successfully");
});

export const getAllCartsGroupedByVendor = asyncHandler(async (req, res, next) => {
  const groupedCarts = await CartRepository.getCartsGroupedByVendor();

  if (!groupedCarts || groupedCarts.length === 0) {
    return next(new ErrorResponse("No carts found.", 404));
  }

  return AppResponse(res, 200, groupedCarts, "Carts grouped by vendor retrieved successfully");
});
