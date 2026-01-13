import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';

// Load biến môi trường
dotenv.config();

// Kết nối DB
connectDB();

const app = express();

// Middleware
app.use(cors()); // Cho phép Client gọi API
app.use(express.json()); // Đọc được JSON từ body request

// Route test
app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});