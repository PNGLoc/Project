import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../../assets/css/SalonRegistration.css';
import HeaderHome from '../../components/layout/HeaderHome';

const SalonRegistration = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false); // Loading state
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
            // Filter out numbers for City field
            const cleanValue = value.replace(/\d/g, '');
            setFormData({ ...formData, [name]: cleanValue });
        } else if (name === 'phone') {
            // Only allow digits for Phone field
            const cleanPhone = value.replace(/\D/g, '');
            setFormData({ ...formData, [name]: cleanPhone });
        } else {
            // Other fields (name, street, district) remain same
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Revoke old object URL to avoid memory leaks
            if (formData.image) {
                URL.revokeObjectURL(URL.createObjectURL(formData.image));
            }
            setFormData({ ...formData, image: file });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (/\d/.test(formData.city)) {
            toast.warning("City name cannot contain numbers.");
            return;
        }

        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(formData.phone)) {
            toast.warning("Invalid phone number. Please enter a valid 10 or 11 digit phone number.");
            return;
        }

        // Required check for District and City
        if (!formData.district.trim() || !formData.city.trim()) {
            toast.warning("Please enter both District and City");
            return;
        }
        setIsLoading(true); // Start loading

        try {
            // 1. Get token from localStorage
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const token = localStorage.getItem('token');

            if (!token) {
                toast.error("Session expired. Please login again.");
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

            // --- 4. POST-SUCCESS HANDLING ---
            if (response.status === 201) {
                // A. Update LocalStorage: Add salonId to current user
                const updatedUser = {
                    ...user,
                    salonId: response.data._id // Newly created salon ID
                };
                localStorage.setItem('user', JSON.stringify(updatedUser));

                // B. Dispatch event for Header to update UI immediately
                window.dispatchEvent(new Event('userUpdated'));

                // C. Notify and redirect
                toast.success("Registration successful! Your application is under review.");
                navigate('/');
            }

        } catch (error) {
            console.error("Registration error:", error.response?.data);

            // Handle duplicate key error
            if (error.response?.data?.error === "DUPLICATE_OWNER" || error.response?.status === 400) {
                toast.error(error.response?.data?.message || "You have already registered a salon.");
            } else if (error.response?.status === 401) {
                toast.error("Session expired. Please login again.");
                navigate('/login');
            } else {
                const serverMessage = error.response?.data?.message || "An error occurred. Please try again later.";
                toast.error(serverMessage);
            }
        } finally {
            setIsLoading(false); // Stop loading regardless of outcome
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