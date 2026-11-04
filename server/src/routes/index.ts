import { Router } from "express";
import authRoutes from "./auth.routes.js";
import repoRoutes from "./repo.routes.js";
import discoveryRoutes from "./discovery.routes.js";
import documentRoutes from "./document.routes.js";
import chatRoutes from "./chat.routes.js";

const apiV1Router = Router();

apiV1Router.use("/auth", authRoutes);
apiV1Router.use("/repos", repoRoutes);
apiV1Router.use("/repos/:repoId/discovery", discoveryRoutes);
apiV1Router.use("/repos/:repoId/documents", documentRoutes);
apiV1Router.use("/repos/:repoId/chats", chatRoutes);

export default apiV1Router;
