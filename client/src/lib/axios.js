import axios from 'axios';

const axiosClient = axios.create({
    baseURL: 'http://localhost:5000', // Trỏ về Server của bạn
    headers: {
        'Content-Type': 'application/json',
    },
});

export default axiosClient;