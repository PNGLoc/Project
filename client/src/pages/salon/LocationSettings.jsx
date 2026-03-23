import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axiosClient from '../../lib/axios';
import { toast } from 'react-toastify';
import { MapPin, Save, Navigation } from 'lucide-react';


// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

import '../../assets/css/LocationSettings.css';

const LocationPicker = ({ position, setPosition }) => {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });
    return <Marker position={position} draggable={true} eventHandlers={{
        dragend: (e) => setPosition(e.target.getLatLng())
    }} />;
};

const LocationSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [salon, setSalon] = useState(null);
    const [address, setAddress] = useState({
        street: '',
        district: '',
        city: 'TP. Hồ Chí Minh'
    });
    const [position, setPosition] = useState({ lat: 10.8231, lng: 106.6297 });

    useEffect(() => {
        const fetchSalonData = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                if (!user?.salonId) return;

                const res = await axiosClient.get(`/api/salons/${user.salonId}/details`);
                if (res.data.success) {
                    const s = res.data.data.salon;
                    setSalon(s);
                    setAddress(s.address || address);
                    if (s.location?.coordinates) {
                        setPosition({ lat: s.location.coordinates[1], lng: s.location.coordinates[0] });
                    }
                }
            } catch (err) {
                console.error("Error fetching salon location:", err);
                toast.error("Failed to load salon details.");
            } finally {
                setLoading(false);
            }
        };
        fetchSalonData();
    }, []);

    const handleSave = async () => {
        try {
            setSaving(true);
            const res = await axiosClient.patch('/api/salons/my-salon', {
                address,
                location: {
                    lat: position.lat,
                    lng: position.lng
                }
            });

            if (res.data.success) {
                toast.success("Location updated successfully!");
            }
        } catch (err) {
            console.error("Error saving location:", err);
            toast.error(err.response?.data?.message || "Failed to save location.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading location settings...</div>;

    return (
        <div className="location-settings-page">
            <div className="location-card">
                <div className="location-header">
                    <div className="location-title">
                        <h2>
                            <MapPin className="text-teal-600" size={32} /> Salon Location
                        </h2>
                        <p>Pin your precise location on the map for clients to find you</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-save-location"
                    >
                        {saving ? "Saving..." : <><Save size={20} /> Save Changes</>}
                    </button>
                </div>

                <div className="location-grid">
                    {/* Address Form */}
                    <div className="space-y-6">
                        <div className="settings-group">
                            <label>Street Address</label>
                            <input
                                type="text"
                                value={address.street}
                                onChange={(e) => setAddress({ ...address, street: e.target.value })}
                                className="settings-input"
                                placeholder="e.g., 123 Nguyen Hue St"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="settings-group">
                                <label>District</label>
                                <input
                                    type="text"
                                    value={address.district}
                                    onChange={(e) => setAddress({ ...address, district: e.target.value })}
                                    className="settings-input"
                                    placeholder="e.g., District 1"
                                />
                            </div>
                            <div className="settings-group">
                                <label>City</label>
                                <input
                                    type="text"
                                    value={address.city}
                                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                                    className="settings-input"
                                />
                            </div>
                        </div>

                        <div className="coordinate-badge">
                            <h4>
                                <Navigation size={18} /> GPS Coordinates
                            </h4>
                            <div className="coordinate-values">
                                <div className="coordinate-item">
                                    <span className="label">Latitude</span>
                                    <span className="value">{position.lat.toFixed(6)}</span>
                                </div>
                                <div className="coordinate-item">
                                    <span className="label">Longitude</span>
                                    <span className="value">{position.lng.toFixed(6)}</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 italic mt-4">
                            * Coordinates are updated automatically when you move the marker on the map.
                        </p>
                    </div>

                    {/* Map Picker */}
                    <div className="map-picker-section">
                        <div className="map-card">
                            <MapContainer center={[position.lat, position.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                />
                                <LocationPicker position={position} setPosition={setPosition} />
                            </MapContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LocationSettings;
