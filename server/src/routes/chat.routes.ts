import { Router } from "express";
import { chatController } from "../controllers/chat.controller.js";
import { requireAuth, verifyRepositoryOwnership } from "../middleware/authGuard.js";
import { validate } from "../middleware/validator.js";
import { createChatSchema, sendChatMessageSchema, updateChatSchema } from "../schemas/chat.schema.js";
import { chatStreamRateLimiter } from "../middleware/rateLimiter.js";

const router = Router({ mergeParams: true });

router.use(requireAuth, verifyRepositoryOwnership);

router.get("/", chatController.list);
router.post("/", validate(createChatSchema), chatController.create);
router.patch("/:chatId", validate(updateChatSchema), chatController.update);
router.delete("/:chatId", chatController.delete);
router.get("/:chatId/messages", chatController.getMessages);
router.post("/:chatId/stream", chatStreamRateLimiter, validate(sendChatMessageSchema), chatController.streamMessage);

export default router;
