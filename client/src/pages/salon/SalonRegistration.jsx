import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../assets/css/SalonRegistration.css';
import HeaderHome from '../../components/layout/HeaderHome';

const SalonRegistration = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false); // Thêm loading state
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        street: '',
        district: '',
        city: '',
        image: null
    });

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'city') {
            // Chỉ lọc bỏ số cho riêng ô City
            const cleanValue = value.replace(/\d/g, '');
            setFormData({ ...formData, [name]: cleanValue });
        } else if (name === 'phone') {
            // Chỉ cho phép nhập số cho ô Phone
            const cleanPhone = value.replace(/\D/g, '');
            setFormData({ ...formData, [name]: cleanPhone });
        } else {
            // Các ô khác (name, street, district) giữ nguyên
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Xóa URL ảo cũ để tránh rò rỉ bộ nhớ
            if (formData.image) {
                URL.revokeObjectURL(URL.createObjectURL(formData.image));
            }
            setFormData({ ...formData, image: file });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (/\d/.test(formData.city)) {
            alert("City name cannot contain numbers.");
            return;
        }

        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(formData.phone)) {
            alert("Invalid phone number. Please enter a valid 10 or 11 digit phone number.");
            return;
        }

        // 2. Kiểm tra bắt buộc nhập District và City
        if (!formData.district.trim() || !formData.city.trim()) {
            alert("Please enter both District and City");
            return;
        }
        setIsLoading(true); // Bắt đầu loading

        try {
            // 1. Lấy token từ localStorage
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const token = localStorage.getItem('token');

            if (!token) {
                alert("Session expired. Please login again.");
                navigate('/login');
                return;
            }

            // 2. Chuẩn bị dữ liệu gửi đi
            const data = new FormData();
            data.append('name', formData.name);
            data.append('phone', formData.phone);
            data.append('address', JSON.stringify({
                street: formData.street,
                district: formData.district,
                city: formData.city
            }));
            if (formData.image) data.append('image', formData.image);

            // 3. Gọi API
            const response = await axios.post('http://localhost:5000/api/salons/register', data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            // --- 4. XỬ LÝ SAU KHI THÀNH CÔNG (QUAN TRỌNG) ---
            if (response.status === 201) {
                // A. Cập nhật LocalStorage: Thêm salonId vào user hiện tại
                const updatedUser = {
                    ...user,
                    salonId: response.data._id // ID của salon vừa tạo
                    // Lưu ý: Không đổi role ở đây, để Backend lo hoặc Admin duyệt xong mới đổi
                };
                localStorage.setItem('user', JSON.stringify(updatedUser));

                // B. Bắn tín hiệu để Header cập nhật giao diện ngay lập tức
                window.dispatchEvent(new Event('userUpdated'));

                // C. Thông báo và chuyển hướng
                alert("Registration successful! Your application is under review.");
                navigate('/');
            }

        } catch (error) {
            console.error("Lỗi đăng ký:", error.response?.data);

            // Xử lý lỗi trùng lặp (Duplicate Key)
            if (error.response?.data?.error === "DUPLICATE_OWNER" || error.response?.status === 400) {
                alert(error.response?.data?.message || "You have already registered a salon.");
            } else if (error.response?.status === 401) {
                alert("Session expired. Please login again.");
                navigate('/login');
            } else {
                const serverMessage = error.response?.data?.message || "An error occurred. Please try again later.";
                alert(serverMessage);
            }
        } finally {
            setIsLoading(false); // Tắt loading dù thành công hay thất bại
        }
    };

    return (
        <>
            {/* Header and home-container moved to MainLayout */}

            <div className="registration-container">
                <div className="registration-box">
                    <h2>Become a Partner</h2>
                    <p className="subtitle">Expand your business and manage professionally with us</p>

                    <form onSubmit={handleSubmit} className="registration-form">
                        <div className="form-group">
                            <label>Salon Name</label>
                            <input type="text" name="name" placeholder="EX: Luxury Hair Spa" onChange={handleChange} required />
                        </div>

                        <div className="form-group">
                            <label>Hotline Phone Number</label>
                            <input
                                type="text"
                                name="phone"
                                placeholder="EX: 0909123456"
                                value={formData.phone}
                                onChange={(e) => {
                                    // Chỉ cho phép nhập số
                                    const val = e.target.value.replace(/\D/g, '');
                                    setFormData({ ...formData, phone: val });
                                }}
                                required
                            />
                        </div>

                        <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                            <div className="form-group" style={{ flex: 2 }}>
                                <label>Street Address</label>
                                <input type="text" name="street" placeholder="Number, Street" onChange={handleChange} required />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>District</label>
                                <input type="text" name="district" placeholder="District" onChange={handleChange} required />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>City</label>
                                <input
                                    type="text"
                                    name="city"
                                    placeholder="EX: HCM"
                                    value={formData.city}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Salon Image</label>
                            <div className="file-upload-wrapper">
                                <input type="file" id="file-upload" onChange={handleFileChange} accept="image/*" hidden />

                                {formData.image ? (
                                    <div className="preview-container">
                                        <label htmlFor="file-upload" className="image-frame-box">
                                            <img src={URL.createObjectURL(formData.image)} alt="Preview" />
                                        </label>
                                        <div className="file-meta-data">
                                            <span className="file-name-text">{formData.image.name}</span>
                                            <label htmlFor="file-upload" className="change-link">Click to change image</label>
                                        </div>
                                    </div>
                                ) : (
                                    <label htmlFor="file-upload" className="file-upload-dropzone">
                                        <div className="upload-placeholder">
                                            <div className="upload-icon">
                                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                                                </svg>
                                            </div>
                                            <p className="upload-text"><b>Click to upload</b> or drag and drop</p>
                                            <p className="upload-subtext">PNG, JPG or JPEG (MAX. 5MB)</p>
                                        </div>
                                    </label>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="submit-btn"
                            disabled={isLoading} // Disable nút khi đang gửi
                            style={{ opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                        >
                            {isLoading ? "Sending..." : "Send Registration Request"}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
};

export default SalonRegistration;