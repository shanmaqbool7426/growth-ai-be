import { Router } from "express";
import {
  createTicket,
  getTickets,
  getTicketById,
  replyToTicket,
  closeTicket,
  reopenTicket,
} from "../../controllers/ticket.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.post("/", createTicket);
router.get("/", getTickets);
router.get("/:id", getTicketById);
router.post("/:id/reply", replyToTicket);
router.patch("/:id/close", closeTicket);
router.patch("/:id/reopen", reopenTicket);

export default router;
