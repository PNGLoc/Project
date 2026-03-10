import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Salon from '../models/Salon.js';
import mongoose from 'mongoose';

// Get or create chat between customer and salon
export const getOrCreateChat = async (req, res) => {
    try {
        const { salonId } = req.params;
        const userId = req.user._id;

        // Check if user is customer
        if (req.user.role !== 'CUSTOMER') {
            return res.status(403).json({
                success: false,
                message: 'Only customers can initiate chats with salons'
            });
        }

        // Find or create chat
        let chat = await Chat.findOne({
            customerId: userId,
            salonId: salonId
        }).populate('customerId', 'fullName avatar')
          .populate('salonId', 'name images');

        if (!chat) {
            // Create new chat
            chat = await Chat.create({
                customerId: userId,
                salonId: salonId
            });
            chat = await Chat.findById(chat._id)
                .populate('customerId', 'fullName avatar')
                .populate('salonId', 'name images');
        }

        res.json({
            success: true,
            data: chat
        });
    } catch (error) {
        console.error('Error in getOrCreateChat:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Get chat list for customer
export const getCustomerChats = async (req, res) => {
    try {
        const userId = req.user._id;

        if (req.user.role !== 'CUSTOMER') {
            return res.status(403).json({
                success: false,
                message: 'Only customers can access this endpoint'
            });
        }

        const chats = await Chat.find({ customerId: userId })
            .populate('salonId', 'name images')
            .populate('lastMessageSenderId', 'fullName')
            .sort({ lastMessageAt: -1 });

        res.json({
            success: true,
            data: chats
        });
    } catch (error) {
        console.error('Error in getCustomerChats:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Get chat list for salon
export const getSalonChats = async (req, res) => {
    try {
        const userId = req.user._id;
        let salonId;

        // Get salonId from user's salonId field or from salon owner
        if (req.user.role === 'SALON_OWNER') {
            const user = await User.findById(userId);
            salonId = user.salonId;
        } else if (req.user.role === 'STAFF') {
            // For staff, get salonId from staff record
            const Staff = (await import('../models/Staff.js')).default;
            const staff = await Staff.findOne({ userId: userId });
            if (!staff) {
                return res.status(404).json({
                    success: false,
                    message: 'Staff record not found'
                });
            }
            salonId = staff.salonId;
        } else {
            return res.status(403).json({
                success: false,
                message: 'Only salon owners and staff can access this endpoint'
            });
        }

        if (!salonId) {
            return res.status(404).json({
                success: false,
                message: 'Salon not found for this user'
            });
        }

        const chats = await Chat.find({ salonId: salonId })
            .populate('customerId', 'fullName avatar')
            .populate('lastMessageSenderId', 'fullName')
            .sort({ lastMessageAt: -1 });

        console.log(`Found ${chats.length} chats for salon ${salonId}`);
        chats.forEach(chat => {
            console.log(`Chat ${chat._id}: customer=${chat.customerId?.fullName}, lastMessage="${chat.lastMessage?.substring(0, 30)}", unread=${chat.salonUnreadCount}`);
        });

        res.json({
            success: true,
            data: chats
        });
    } catch (error) {
        console.error('Error in getSalonChats:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Get messages for a specific chat
export const getChatMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user._id;

        // Verify user has access to this chat
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        // Check if user is part of this chat
        const isCustomer = chat.customerId.toString() === userId.toString();
        const isSalonOwner = req.user.role === 'SALON_OWNER' || req.user.role === 'STAFF';
        let hasAccess = false;

        if (isCustomer) {
            hasAccess = true;
        } else if (isSalonOwner) {
            const user = await User.findById(userId);
            let userSalonId = user.salonId;
            
            if (!userSalonId && req.user.role === 'STAFF') {
                const Staff = (await import('../models/Staff.js')).default;
                const staff = await Staff.findOne({ userId: userId });
                userSalonId = staff?.salonId;
            }
            
            hasAccess = chat.salonId.toString() === userSalonId?.toString();
        }

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this chat'
            });
        }

        // Get messages - ensure chatId is converted to ObjectId
        let queryChatId = chatId;
        
        // Convert string to ObjectId if needed
        if (typeof chatId === 'string' && mongoose.Types.ObjectId.isValid(chatId)) {
            queryChatId = new mongoose.Types.ObjectId(chatId);
        }
        
        console.log('Querying messages for chatId:', queryChatId, 'Type:', typeof queryChatId, 'Original:', chatId);
        const messages = await Message.find({ chatId: queryChatId })
            .populate('senderId', 'fullName avatar')
            .sort({ createdAt: 1 });
        
        console.log(`Found ${messages.length} messages for chat ${chatId}`);
        if (messages.length > 0) {
            console.log('First message sample:', {
                _id: messages[0]._id,
                content: messages[0].content?.substring(0, 50),
                senderId: messages[0].senderId?._id || messages[0].senderId,
                senderType: messages[0].senderType,
                chatId: messages[0].chatId,
                chatIdType: typeof messages[0].chatId
            });
        } else {
            // Debug: Check if there are any messages with similar chatId
            const allMessages = await Message.find({}).limit(5);
            console.log('Sample of all messages in DB:', allMessages.map(m => ({
                _id: m._id,
                chatId: m.chatId,
                chatIdType: typeof m.chatId,
                content: m.content?.substring(0, 30)
            })));
        }

        // Mark messages as read
        const senderType = isCustomer ? 'CUSTOMER' : 'SALON';
        const unreadField = isCustomer ? 'customerUnreadCount' : 'salonUnreadCount';
        
        await Message.updateMany(
            {
                chatId: chatId,
                senderType: { $ne: senderType },
                isRead: false
            },
            {
                isRead: true,
                readAt: new Date()
            }
        );

        // Reset unread count
        await Chat.findByIdAndUpdate(chatId, {
            [unreadField]: 0
        });

        res.json({
            success: true,
            data: messages
        });
    } catch (error) {
        console.error('Error in getChatMessages:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Send a message
export const sendMessage = async (req, res) => {
    try {
        const { chatId } = req.params; // Get chatId from URL params
        const { content } = req.body; // Get content from request body
        const userId = req.user._id;

        console.log('sendMessage called with:', { chatId, content: content?.substring(0, 50), userId });

        if (!chatId) {
            return res.status(400).json({
                success: false,
                message: 'Chat ID is required'
            });
        }

        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Message content is required'
            });
        }

        // Verify chat exists and user has access
        console.log('Looking for chat with ID:', chatId);
        const chat = await Chat.findById(chatId);
        console.log('Chat found:', chat ? 'Yes' : 'No', chat ? chat._id : 'N/A');
        
        if (!chat) {
            console.error('Chat not found for chatId:', chatId);
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        // Determine sender type
        const isCustomer = chat.customerId.toString() === userId.toString();
        let senderType = 'CUSTOMER';
        let hasAccess = false;

        if (isCustomer) {
            hasAccess = true;
        } else {
            // Check if user is salon owner or staff
            const user = await User.findById(userId);
            let userSalonId = user.salonId;
            
            if (!userSalonId && (req.user.role === 'STAFF')) {
                const Staff = (await import('../models/Staff.js')).default;
                const staff = await Staff.findOne({ userId: userId });
                userSalonId = staff?.salonId;
            }
            
            if (userSalonId && chat.salonId.toString() === userSalonId.toString()) {
                hasAccess = true;
                senderType = 'SALON';
            }
        }

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this chat'
            });
        }

        // Create message - ensure chatId is ObjectId
        let messageChatId = chatId;
        
        // Convert string to ObjectId if needed
        if (typeof chatId === 'string' && mongoose.Types.ObjectId.isValid(chatId)) {
            messageChatId = new mongoose.Types.ObjectId(chatId);
        }
        
        console.log('Creating message with chatId:', messageChatId, 'Type:', typeof messageChatId, 'senderId:', userId, 'content:', content.substring(0, 50));
        
        const message = await Message.create({
            chatId: messageChatId,
            senderId: userId,
            senderType: senderType,
            content: content.trim()
        });
        
        console.log('Message created successfully:', {
            _id: message._id,
            chatId: message.chatId,
            chatIdType: typeof message.chatId,
            senderId: message.senderId,
            content: message.content?.substring(0, 30)
        });

        // Update chat with last message
        const unreadField = isCustomer ? 'salonUnreadCount' : 'customerUnreadCount';
        await Chat.findByIdAndUpdate(chatId, {
            lastMessage: content.trim(),
            lastMessageAt: new Date(),
            lastMessageSenderId: userId,
            $inc: { [unreadField]: 1 }
        });

        const populatedMessage = await Message.findById(message._id)
            .populate('senderId', 'fullName avatar');

        res.json({
            success: true,
            data: populatedMessage
        });
    } catch (error) {
        console.error('Error in sendMessage:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Get or create chat for salon (when salon clicks on a user)
export const getOrCreateChatForSalon = async (req, res) => {
    try {
        const { customerId } = req.params;
        const userId = req.user._id;

        // Check if user is salon owner or staff
        if (req.user.role !== 'SALON_OWNER' && req.user.role !== 'STAFF') {
            return res.status(403).json({
                success: false,
                message: 'Only salon owners and staff can access this endpoint'
            });
        }

        // Get salonId
        const user = await User.findById(userId);
        let salonId = user.salonId;
        
        if (!salonId && req.user.role === 'STAFF') {
            const Staff = (await import('../models/Staff.js')).default;
            const staff = await Staff.findOne({ userId: userId });
            if (!staff) {
                return res.status(404).json({
                    success: false,
                    message: 'Staff record not found'
                });
            }
            salonId = staff.salonId;
        }

        if (!salonId) {
            return res.status(404).json({
                success: false,
                message: 'Salon not found for this user'
            });
        }

        // Find or create chat
        let chat = await Chat.findOne({
            customerId: customerId,
            salonId: salonId
        }).populate('customerId', 'fullName avatar')
          .populate('salonId', 'name images');

        if (!chat) {
            chat = await Chat.create({
                customerId: customerId,
                salonId: salonId
            });
            chat = await Chat.findById(chat._id)
                .populate('customerId', 'fullName avatar')
                .populate('salonId', 'name images');
        }

        res.json({
            success: true,
            data: chat
        });
    } catch (error) {
        console.error('Error in getOrCreateChatForSalon:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

