import { Hono } from "hono";
import {
  getAllCustomers,
  getCustomerById,
  getCustomerStats,
  deleteCustomer,
} from "../controllers/customer.controller";
import { protectRoute, adminRoute } from "../middlewares/auth.middleware";

const router = new Hono();

// All routes require admin access
router.get("/", protectRoute, adminRoute, getAllCustomers);
router.get("/stats", protectRoute, adminRoute, getCustomerStats);
router.get("/:id", protectRoute, adminRoute, getCustomerById);
router.delete("/:id", protectRoute, adminRoute, deleteCustomer);

export default router;