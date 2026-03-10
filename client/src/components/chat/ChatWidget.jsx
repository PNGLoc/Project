import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import chatApi from '../../features/chat/api/chatApi';
import './ChatWidget.css';

const ChatWidget = ({ userRole, salonId, customerId, onClose }) => {
    const [isChatListOpen, setIsChatListOpen] = useState(!salonId && !customerId);
    const [isChatWindowOpen, setIsChatWindowOpen] = useState(!!salonId || !!customerId);
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    const isCustomer = userRole === 'CUSTOMER';
    const isSalon = userRole === 'SALON_OWNER' || userRole === 'STAFF';

    // If salonId or customerId is provided, open chat directly
    useEffect(() => {
        if (salonId && isCustomer && !selectedChat) {
            openChatWithSalon(salonId);
        } else if (customerId && isSalon && !selectedChat) {
            openChatWithCustomer(customerId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [salonId, customerId, isCustomer, isSalon]);

    // Fetch chats list
    useEffect(() => {
        let interval;
        if (isChatListOpen) {
            fetchChats(true); // First load with loading indicator
            
            // Poll for new chats/messages every 5 seconds silently
            interval = setInterval(() => {
                fetchChatsSilently();
            }, 5000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isChatListOpen, userRole]);

    // Fetch messages when chat is selected
    useEffect(() => {
        if (selectedChat && selectedChat._id) {
            const chatId = selectedChat._id;
            fetchMessages(true); // Show loading on initial fetch
            
            // Poll for new messages every 3 seconds (silently, without showing loading)
            const interval = setInterval(() => {
                // Use chatId from closure to ensure we're fetching the right chat
                const fetchMessagesSilently = async () => {
                    try {
                        const response = await chatApi.getChatMessages(chatId);
                        if (response.success) {
                            const newMessages = response.data || [];
                            setMessages(newMessages);
                        }
                    } catch (error) {
                        console.error('Error fetching messages silently:', error);
                    }
                };
                fetchMessagesSilently();
            }, 3000);
            
            return () => clearInterval(interval);
        }
    }, [selectedChat]);

    // Auto scroll to bottom when new messages arrive
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const openChatWithSalon = async (salonId) => {
        if (!salonId) {
            console.error('Salon ID is required');
            return;
        }
        try {
            setLoading(true);
            console.log('Opening chat with salonId:', salonId);
            const response = await chatApi.getOrCreateChat(salonId);
            console.log('Open chat response:', response);
            if (response.success && response.data) {
                const chat = response.data;
                console.log('Chat created/retrieved:', chat);
                if (!chat._id) {
                    console.error('Chat object missing _id:', chat);
                    alert('Lỗi: Chat không có ID. Vui lòng thử lại.');
                    return;
                }
                setSelectedChat(chat);
                setIsChatListOpen(false);
                setIsChatWindowOpen(true);
            } else {
                console.error('Failed to open chat:', response.message || 'Unknown error');
                alert(response.message || 'Không thể mở chat. Vui lòng thử lại sau.');
            }
        } catch (error) {
            console.error('Error opening chat with salon:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Không thể mở chat';
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const openChatWithCustomer = async (customerId) => {
        if (!customerId) {
            console.error('Customer ID is required');
            return;
        }
        try {
            setLoading(true);
            const response = await chatApi.getOrCreateChatForSalon(customerId);
            if (response.success && response.data) {
                setSelectedChat(response.data);
                setIsChatListOpen(false);
                setIsChatWindowOpen(true);
            } else {
                console.error('Failed to open chat:', response.message || 'Unknown error');
            }
        } catch (error) {
            console.error('Error opening chat with customer:', error);
            // Show error to user
            alert('Không thể mở chat. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    const fetchChats = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const response = isCustomer
                ? await chatApi.getCustomerChats()
                : await chatApi.getSalonChats();
            
            if (response.success) {
                setChats(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching chats:', error);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const fetchChatsSilently = async () => {
        try {
            const response = isCustomer
                ? await chatApi.getCustomerChats()
                : await chatApi.getSalonChats();
            
            if (response.success) {
                setChats(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching chats silently:', error);
        }
    };

    const fetchMessages = async (showLoading = true) => {
        if (!selectedChat || !selectedChat._id) {
            console.error('Cannot fetch messages: selectedChat is null or missing _id');
            return;
        }
        
        try {
            if (showLoading) {
                setMessagesLoading(true);
            }
            const response = await chatApi.getChatMessages(selectedChat._id);
            console.log('Fetch messages response:', response);
            console.log('Selected chat:', selectedChat);
            if (response.success) {
                const newMessages = response.data || [];
                console.log('Received messages:', newMessages.length, newMessages);
                setMessages(newMessages);
            } else {
                console.error('Failed to fetch messages:', response.message);
                alert('Không thể tải tin nhắn: ' + (response.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            if (showLoading) {
                setMessagesLoading(false);
            }
        }
    };

    const handleChatSelect = (chat) => {
        setSelectedChat(chat);
        setIsChatListOpen(false);
        setIsChatWindowOpen(true);
    };

    const handleBackToList = () => {
        setIsChatWindowOpen(false);
        setIsChatListOpen(true);
        setSelectedChat(null);
        setMessages([]);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) {
            return;
        }
        
        if (!selectedChat || !selectedChat._id) {
            console.error('Cannot send message: selectedChat is null or missing _id', selectedChat);
            alert('Chat chưa được khởi tạo. Vui lòng đợi một chút và thử lại.');
            return;
        }

        const content = newMessage.trim();
        const chatId = selectedChat._id;
        setNewMessage('');

        try {
            console.log('Sending message to chatId:', chatId, 'Content:', content);
            const response = await chatApi.sendMessage(chatId, content);
            console.log('Send message response:', response);
            
            if (response && response.success && response.data) {
                // Add new message to the list (check for duplicates)
                setMessages(prev => {
                    const exists = prev.some(msg => msg._id === response.data._id);
                    if (exists) {
                        return prev;
                    }
                    return [...prev, response.data];
                });
                // Refresh chat list to update last message
                if (isChatListOpen) {
                    fetchChats();
                }
                // Scroll to bottom after sending
                setTimeout(() => scrollToBottom(), 100);
            } else {
                console.error('Failed to send message:', response?.message || 'Unknown error');
                setNewMessage(content); // Restore message on error
                alert(response?.message || 'Không thể gửi tin nhắn. Vui lòng thử lại.');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setNewMessage(content); // Restore message on error
            const errorMessage = error.response?.data?.message || error.message || 'Không thể gửi tin nhắn';
            alert(errorMessage);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString('vi-VN');
    };

    const getChatName = (chat) => {
        if (isCustomer) {
            return chat.salonId?.name || 'Unknown Salon';
        } else {
            return chat.customerId?.fullName || 'Unknown Customer';
        }
    };

    const getChatAvatar = (chat) => {
        if (isCustomer) {
            const image = chat.salonId?.images?.[0];
            return image ? `http://localhost:5000${image}` : 'https://via.placeholder.com/50';
        } else {
            const avatar = chat.customerId?.avatar;
            return avatar ? `http://localhost:5000${avatar}` : 'https://via.placeholder.com/50';
        }
    };

    const getUnreadCount = (chat) => {
        return isCustomer ? chat.customerUnreadCount : chat.salonUnreadCount;
    };

    return (
        <div className="chat-widget-container">
            {isChatListOpen && (
                <div className="chat-list-panel">
                    <div className="chat-list-header">
                        <h3>Messages</h3>
                        <button onClick={onClose} className="chat-close-btn">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="chat-list-content">
                        {loading ? (
                            <div className="chat-loading">Loading chats...</div>
                        ) : chats.length === 0 ? (
                            <div className="chat-empty">No conversations yet</div>
                        ) : (
                            chats.map((chat) => {
                                const unreadCount = getUnreadCount(chat);
                                return (
                                    <div
                                        key={chat._id}
                                        className="chat-list-item"
                                        onClick={() => handleChatSelect(chat)}
                                    >
                                        <img
                                            src={getChatAvatar(chat)}
                                            alt={getChatName(chat)}
                                            className="chat-list-avatar"
                                        />
                                        <div className="chat-list-info">
                                            <div className="chat-list-name-row">
                                                <span className="chat-list-name">{getChatName(chat)}</span>
                                                {unreadCount > 0 && (
                                                    <span className="chat-unread-badge">{unreadCount}</span>
                                                )}
                                            </div>
                                            <p className="chat-list-last-message">
                                                {chat.lastMessage || 'No messages yet'}
                                            </p>
                                            <span className="chat-list-time">
                                                {chat.lastMessageAt ? formatTime(chat.lastMessageAt) : ''}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {(isChatWindowOpen && selectedChat) || (isChatWindowOpen && loading && salonId) ? (
                <div className="chat-window-panel">
                    {loading && !selectedChat ? (
                        <>
                            <div className="chat-window-header">
                                <button onClick={onClose} className="chat-close-btn">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="chat-messages-container">
                                <div className="chat-loading">Opening chat...</div>
                            </div>
                        </>
                    ) : selectedChat ? (
                        <>
                            <div className="chat-window-header">
                                <button onClick={handleBackToList} className="chat-back-btn">
                                    ← Back
                                </button>
                                <div className="chat-window-user-info">
                                    <img
                                        src={getChatAvatar(selectedChat)}
                                        alt={getChatName(selectedChat)}
                                        className="chat-window-avatar"
                                    />
                                    <span className="chat-window-name">{getChatName(selectedChat)}</span>
                                </div>
                                <button onClick={onClose} className="chat-close-btn">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="chat-messages-container" ref={messagesContainerRef}>
                                {messagesLoading ? (
                                    <div className="chat-loading">Loading messages...</div>
                                ) : messages.length === 0 ? (
                                    <div className="chat-empty">No messages yet. Start the conversation!</div>
                                ) : (
                                    messages.map((message) => {
                                        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                                        const isOwnMessage = message.senderId._id === currentUser._id;
                                        return (
                                            <div
                                                key={message._id}
                                                className={`chat-message ${isOwnMessage ? 'own-message' : 'other-message'}`}
                                            >
                                                {!isOwnMessage && (
                                                    <img
                                                        src={message.senderId.avatar ? `http://localhost:5000${message.senderId.avatar}` : 'https://via.placeholder.com/30'}
                                                        alt={message.senderId.fullName}
                                                        className="chat-message-avatar"
                                                    />
                                                )}
                                                <div className="chat-message-content">
                                                    <p>{message.content}</p>
                                                    <span className="chat-message-time">
                                                        {new Date(message.createdAt).toLocaleTimeString('vi-VN', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            <form onSubmit={handleSendMessage} className="chat-input-form">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="chat-input"
                                />
                                <button type="submit" className="chat-send-btn" disabled={!newMessage.trim()}>
                                    <Send size={20} />
                                </button>
                            </form>
                        </>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
};

export default ChatWidget;

