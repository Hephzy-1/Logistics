import asyncHandler from "../middlewares/async";
import { IMenu } from "../models/menu";
import { Menu } from "../usecases/menu";
import { ErrorResponse } from "../utils/errorResponse";
import { menus } from "../validators/vendor";
import { uploadProfilePic } from "./customer";

export const newMenu = asyncHandler(async (req, res, next) => {
  req.body.vendorId = req.vendor?._id
  
  // Step 1: Validate Input
  const { error, value } = menus.validate(req.body);

  if (error) return next(new ErrorResponse(error.details[0].message, 400));

  const { menuName, menuDescription, itemName, price, category, availability } = value;

  // Step 2: Handle file upload
  const itemPicture = await uploadProfilePic(req.body.file); 

  req.body.menuItem.picture = itemPicture;
  req.body.menuItem.itemName = itemName;
  req.body.menuItem.price = price;
  req.body.menuItem.category = category;
  req.body.menuItem.availability = availability;

  // Step 5: Create Menu
  const menu = await Menu.create(req.body);

  // Step 6: Return Response
  return res.status(201).json({
    success: true,
    message: 'Menu created successfully',
    data: menu,
  });
});


