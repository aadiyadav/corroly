import { Router } from "express";
import { discoveryController } from "../controllers/discovery.controller.js";
import { requireAuth, verifyRepositoryOwnership } from "../middleware/authGuard.js";
import { validate } from "../middleware/validator.js";
import { searchDiscoverySchema } from "../schemas/discovery.schema.js";
import { discoveryRateLimiter } from "../middleware/rateLimiter.js";

const router = Router({ mergeParams: true });

router.use(requireAuth, verifyRepositoryOwnership);

router.post("/search", discoveryRateLimiter, validate(searchDiscoverySchema), discoveryController.search);

export default router;
