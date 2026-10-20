
import { Router } from "express";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  clearReadNotifications,
} from "../controllers/notificationController.js";

const router = Router();

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);

router.patch("/read-all", markAllNotificationsRead);
router.delete("/read", clearReadNotifications);
router.patch("/:id/read", markNotificationRead);

export default router;
