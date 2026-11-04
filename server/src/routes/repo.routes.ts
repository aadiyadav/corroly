import { Router } from "express";
import { repoController } from "../controllers/repo.controller.js";
import { requireAuth, verifyRepositoryOwnership } from "../middleware/authGuard.js";
import { validate } from "../middleware/validator.js";
import { createRepoSchema, updateRepoSchema, listRepoSchema } from "../schemas/repo.schema.js";

const router = Router();

router.use(requireAuth);

router.post("/", validate(createRepoSchema), repoController.create);
router.get("/", validate(listRepoSchema), repoController.list);
router.get("/:repoId", verifyRepositoryOwnership, repoController.getOne);
router.patch("/:repoId", verifyRepositoryOwnership, validate(updateRepoSchema), repoController.update);
router.delete("/:repoId", verifyRepositoryOwnership, repoController.delete);

export default router;
