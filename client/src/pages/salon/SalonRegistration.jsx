import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from 'lucide-react';
import { FiUpload } from 'react-icons/fi';
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
        address: '',
        image: null
    });

    const [position, setPosition] = useState({ lat: 10.8231, lng: 106.6297 });
    const [mapType, setMapType] = useState('street'); // 'street' or 'satellite'

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'phone') {
            const cleanPhone = value.replace(/\D/g, '');
            setFormData({ ...formData, [name]: cleanPhone });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, image: file });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(formData.phone)) {
            toast.warning("Invalid phone number. Please enter a valid 10 or 11 digit phone number.");
            return;
        }

        if (!formData.address.trim()) {
            toast.warning("Please enter the salon address.");
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
            data.append('address', formData.address);
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

    const handleFindOnMap = async () => {
        if (!formData.address.trim()) {
            toast.warn("Please enter an address first.");
            return;
        }

        const parts = formData.address.split(',').map(p => p.trim());
        const queries = [];
        
        // 1. Full address
        queries.push(`${formData.address}, Vietnam`);
        
        // 2. Street name (No house number)
        if (parts.length >= 1) {
            const streetName = parts[0].replace(/^\d+[\s\w]*\.\s*/, '').replace(/^\d+\s+/, '');
            if (streetName !== parts[0]) {
                queries.push(`${streetName}, ${parts.slice(1).join(', ')}, Vietnam`);
            }
        }
        
        // 3. Street + City
        if (parts.length >= 2) {
            queries.push(`${parts[0]}, ${parts[parts.length-1]}, Vietnam`);
        }

        // 4. District + City
        if (parts.length >= 2) {
            queries.push(`${parts.slice(-2).join(', ')}, Vietnam`);
        }

        try {
            setIsLoading(true);
            let found = false;

            for (const q of queries) {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`, {
                    headers: { 'User-Agent': 'SalonManagementApp/1.0' }
                });
                const data = await res.json();
                if (data && data.length > 0) {
                    const { lat, lon } = data[0];
                    setPosition({ lat: parseFloat(lat), lng: parseFloat(lon) });
                    toast.success("Location found!");
                    found = true;
                    break;
                }
            }

            if (!found) {
                toast.warn("Could not find this precise address. Please try a more general address (e.g. District, City) and drag the marker.");
            }
        } catch (err) {
            console.error("Geocoding error:", err);
            toast.error("Error searching for location.");
        } finally {
            setIsLoading(false);
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

                        <div className="form-group">
                            <label>Full Address</label>
                            <input 
                                type="text" 
                                name="address" 
                                placeholder="Ví dụ: 133 Đ. Trần Hưng Đạo, An Phú, Ninh Kiều, Cần Thơ" 
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                                required 
                            />
                        </div>

                        <button 
                            type="button"
                            onClick={handleFindOnMap}
                            className="btn-find-map"
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: '#f0f9ff',
                                border: '1px dashed #0d9488',
                                borderRadius: '8px',
                                color: '#0d9488',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s',
                                marginBottom: '20px'
                            }}
                        >
                            <Navigation size={18} /> Find Address on Map
                        </button>

                        <div className="form-group">
                            <label>Salon Image</label>
                            <div className="file-upload-wrapper">
                                {formData.image ? (
                                    <div className="image-preview-container">
                                        <div className="image-frame-box" onClick={() => document.getElementById('salon-image-input').click()}>
                                            <img src={URL.createObjectURL(formData.image)} alt="Salon Preview" />
                                        </div>
                                        <div className="file-meta-data">
                                            <span className="file-name-text">{formData.image.name}</span>
                                            <span className="change-link" onClick={() => document.getElementById('salon-image-input').click()}>
                                                Change Image
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="file-upload-dropzone" onClick={() => document.getElementById('salon-image-input').click()}>
                                        <div className="upload-placeholder">
                                            <div className="upload-icon">
                                                <FiUpload size={32} />
                                            </div>
                                            <p className="upload-text"><b>Click to upload</b> or drag and drop</p>
                                            <p className="upload-subtext">PNG, JPG, JPEG (MAX. 5MB)</p>
                                        </div>
                                    </div>
                                )}
                                <input
                                    id="salon-image-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Pin your salon on the map</label>
                            
                            {/* Map Mode Toggle */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <button 
                                    type="button"
                                    onClick={() => setMapType('street')}
                                    style={{
                                        flex: 1, padding: '8px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                        background: mapType === 'street' ? '#0d9488' : '#f8fafc',
                                        color: mapType === 'street' ? '#fff' : '#64748b',
                                        border: '1px solid',
                                        borderColor: mapType === 'street' ? '#0d9488' : '#e2e8f0',
                                        transition: 'all 0.2s'
                                    }}
                                >Street View</button>
                                <button 
                                    type="button"
                                    onClick={() => setMapType('satellite')}
                                    style={{
                                        flex: 1, padding: '8px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                        background: mapType === 'satellite' ? '#0d9488' : '#f8fafc',
                                        color: mapType === 'satellite' ? '#fff' : '#64748b',
                                        border: '1px solid',
                                        borderColor: mapType === 'satellite' ? '#0d9488' : '#e2e8f0',
                                        transition: 'all 0.2s'
                                    }}
                                >Satellite View</button>
                            </div>

                            <div className="map-registration-wrapper" style={{ height: '350px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                <MapContainer
                                    key={`${position.lat}-${position.lng}-${mapType}`}
                                    center={[position.lat, position.lng]}
                                    zoom={17}
                                    maxZoom={18}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    {mapType === 'street' ? (
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        />
                                    ) : (
                                        <TileLayer
                                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                            attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
                                            maxNativeZoom={18}
                                        />
                                    )}
                                    <LocationPicker position={position} setPosition={({ lat, lng }) => {
                                        setPosition({ lat, lng });
                                    }} />
                                </MapContainer>
                            </div>
                            <p className="map-tip" style={{ marginTop: '8px', color: '#64748b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Navigation size={14} /> Tip: Use Satellite view to see building rooftops for better accuracy.
                            </p>
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