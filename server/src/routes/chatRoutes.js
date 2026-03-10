import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
    getOrCreateChat,
    getCustomerChats,
    getSalonChats,
    getChatMessages,
    sendMessage,
    getOrCreateChatForSalon
} from '../controllers/chatController.js';

const router = express.Router();

// Customer routes
router.get('/customer/chats', protect, getCustomerChats);
router.post('/customer/salon/:salonId', protect, getOrCreateChat);

// Salon routes
router.get('/salon/chats', protect, getSalonChats);
router.post('/salon/customer/:customerId', protect, getOrCreateChatForSalon);

// Common routes
router.get('/:chatId/messages', protect, getChatMessages);
router.post('/:chatId/messages', protect, sendMessage);

export default router;

