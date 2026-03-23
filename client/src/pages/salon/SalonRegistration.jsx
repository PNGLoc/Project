import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../../assets/css/SalonRegistration.css';
import HeaderHome from '../../components/layout/HeaderHome';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom component to handle map click
const LocationPicker = ({ position, setPosition }) => {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    return position ? <Marker position={position} draggable={true} eventHandlers={{
        dragend: (e) => setPosition(e.target.getLatLng())
    }} /> : null;
};

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

    // Default to Ho Chi Minh City coordinates
    const [position, setPosition] = useState({ lat: 10.8231, lng: 106.6297 });

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
            data.append('location', JSON.stringify({
                lat: position.lat,
                lng: position.lng
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
                            {/* ... previous file upload code ... */}
                        </div>

                        <div className="form-group">
                            <label>Pin your salon on the map</label>
                            <div className="form-group">
                                <label>Select Precise Location on Map</label>
                                <div className="map-registration-wrapper" style={{ height: '300px' }}>
                                    <MapContainer
                                        center={[position.lat, position.lng]}
                                        zoom={15}
                                        style={{ height: '100%', width: '100%' }}
                                    >
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        />
                                        <LocationPicker position={position} setPosition={({ lat, lng }) => {
                                            setPosition({ lat, lng });
                                        }} />
                                    </MapContainer>
                                </div>
                                <p className="map-tip">
                                    <Navigation size={14} /> Tip: Click on the map or drag the marker to pinpoint your salon.
                                </p>
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