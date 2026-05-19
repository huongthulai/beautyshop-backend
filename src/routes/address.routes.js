const express = require("express");
const addressController = require("../controllers/address.controller");
const validate = require("../middlewares/validate.middleware");
const {
  createAddressSchema,
  updateAddressSchema,
} = require("../validators/address.validator");
const { verifyToken } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(verifyToken);

router.get("/", addressController.getMyAddresses);
router.get("/:id", addressController.getAddress);
router.post("/", validate(createAddressSchema), addressController.createAddress);
router.patch("/:id", validate(updateAddressSchema), addressController.updateAddress);
router.delete("/:id", addressController.deleteAddress);
router.patch("/:id/default", addressController.setDefaultAddress);

module.exports = router;
