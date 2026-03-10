import axiosClient from '../../../lib/axios';

const chatApi = {
    // Get or create chat with salon (customer)
    getOrCreateChat: async (salonId) => {
        const response = await axiosClient.post(`/api/chats/customer/salon/${salonId}`);
        return response.data;
    },

    // Get customer's chat list
    getCustomerChats: async () => {
        const response = await axiosClient.get('/api/chats/customer/chats');
        return response.data;
    },

    // Get salon's chat list
    getSalonChats: async () => {
        const response = await axiosClient.get('/api/chats/salon/chats');
        return response.data;
    },

    // Get or create chat with customer (salon)
    getOrCreateChatForSalon: async (customerId) => {
        const response = await axiosClient.post(`/api/chats/salon/customer/${customerId}`);
        return response.data;
    },

    // Get messages for a chat
    getChatMessages: async (chatId) => {
        const response = await axiosClient.get(`/api/chats/${chatId}/messages`);
        return response.data;
    },

    // Send a message
    sendMessage: async (chatId, content) => {
        const response = await axiosClient.post(`/api/chats/${chatId}/messages`, {
            content
        });
        return response.data;
    }
};

export default chatApi;

