import { Router } from "express";
import { documentController } from "../controllers/document.controller.js";
import { requireAuth, verifyRepositoryOwnership } from "../middleware/authGuard.js";
import { validate } from "../middleware/validator.js";
import {
  importDiscoveredSchema,
  getDocumentProgressSchema,
  deleteDocumentSchema,
} from "../schemas/document.schema.js";

import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const router = Router({ mergeParams: true });

router.use(requireAuth, verifyRepositoryOwnership);

router.post("/import-discovered", validate(importDiscoveredSchema), documentController.importDiscovered);
router.post("/upload", upload.single("file"), documentController.upload);
router.get("/", documentController.list);
router.get("/:docId", documentController.getOne);
router.get("/:docId/file", documentController.streamFile);
router.get("/:docId/progress", validate(getDocumentProgressSchema), documentController.streamProgress);
router.delete("/:docId", validate(deleteDocumentSchema), documentController.delete);

export default router;
