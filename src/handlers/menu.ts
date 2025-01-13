import asyncHandler from "../middlewares/async";
import { IMenu } from "../models/menu";
import { Menu } from "../usecases/menu";
import { ErrorResponse } from "../utils/errorResponse";
import { menus } from "../validators/vendor";
import { uploadProfilePic } from "./customer";
import { AppResponse } from "../middlewares/appResponse";

export const newMenu = asyncHandler(async (req, res, next) => {
  // Step 1: Validate Input
  // const { error, value } = menus.validate(req.body);

  // if (error) return next(new ErrorResponse(error.details[0].message, 400));

  if (!req.file) {
    return next(new ErrorResponse("Picture is required", 400));
  }

  req.body.vendorId = req.vendor?._id;
  req.body.picture = req.file.path;  // Use multer's file path for storage

  // Step 2: Create menu with items
  const createdMenu = await Menu.createNewMenu(req.body);

  // Step 3: Return Response
  return AppResponse(res, 201, createdMenu, "Menu created successfully");
});

// export const getMenu = asyncHandler(async (req, res, next) => {
//   const menuId = req.params.id;
//   const vendorId = req.vendor?._id;

//   if (!menuId && (!vendorId || typeof vendorId !== "string")) {
//     return next(new ErrorResponse("Menu ID or Vendor ID is required.", 400));
//   }

//   let menu;

//   // Step 1: Retrieve menu by ID or vendor ID
//   if (menuId) {
//     menu = await Menu.menuById(menuId);
//   } else {
//     menu = await Menu.menuByVendorId(vendorId);
//   }

//   if (!menu) {
//     return next(new ErrorResponse("Menu not found", 404));
//   }

//   // Step 2: Return response
//   return AppResponse(res, 200, menu, "Menu retrieved successfully");
// });

export const getVerifiedVendorsMenus = asyncHandler(async (req, res, next) => {
  // Step 1: Retrieve menus for verified vendors
  const menus = await Menu.menusByVerifiedVendors();

  // Step 2: Check if menus exist
  if (!menus || menus.length === 0) {
    return next(new ErrorResponse("No menus found for verified vendors", 404));
  }

  return AppResponse(res, 200, menus, "Menus retrieved successfully");
});

// export const getMenusByCategoryForVerifiedVendors = asyncHandler(async (req, res, next) => {
//   // Step 1: Retrieve menus for verified vendors
//   const menus = await Menu.menusByVerifiedVendors();

//   // Step 2: Check if menus exist
//   if (!menus || menus.length === 0) {
//     return next(new ErrorResponse("No menus found for verified vendors", 404));
//   }

//   // Step 3: Group menus by category
//   const menus = await Menu.menusByVerifiedVendors(); // Await the promise before using forEach
// menus.forEach((menu: any) => {  
//     menu.menuItems.forEach((item: any) => {
//       if (!categorizedMenus[item.category]) {
//         categorizedMenus[item.category] = [];
//       }
//       categorizedMenus[item.category].push({
//         menuName: menu.name,
//         menuDescription: menu.description,
//         vendorId: menu.vendorId,
//         itemName: item.itemName,
//         price: item.price,
//         availability: item.availability,
//         picture: item.picture,
//       });
//     });
//   });

//   // Step 4: Return response
//   return AppResponse(res, 200, categorizedMenus, "Menus categorized by category retrieved successfully");
// });
