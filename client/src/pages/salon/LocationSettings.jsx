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
    const [address, setAddress] = useState('');
    const [position, setPosition] = useState({ lat: 10.8231, lng: 106.6297 });
    const [mapType, setMapType] = useState('street'); // 'street' or 'satellite'

    useEffect(() => {
        const fetchSalonData = async () => {
            try {
                const res = await axiosClient.get('/api/salons/my-salon');
                if (res.data.success) {
                    const s = res.data.data;
                    setSalon(s);
                    setAddress(s.address || '');
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

    const handleFindOnMap = async () => {
        if (!address.trim()) {
            toast.warn("Please enter an address first.");
            return;
        }

        const parts = address.split(',').map(p => p.trim());
        const queries = [];

        // 1. Full address
        queries.push(`${address}, Vietnam`);

        // 2. Street name (No house number)
        if (parts.length >= 1) {
            const streetName = parts[0].replace(/^\d+[\s\w]*\.\s*/, '').replace(/^\d+\s+/, '');
            if (streetName !== parts[0]) {
                queries.push(`${streetName}, ${parts.slice(1).join(', ')}, Vietnam`);
            }
        }

        // 3. Street + City
        if (parts.length >= 2) {
            queries.push(`${parts[0]}, ${parts[parts.length - 1]}, Vietnam`);
        }

        // 4. District + City
        if (parts.length >= 2) {
            queries.push(`${parts.slice(-2).join(', ')}, Vietnam`);
        }

        try {
            setSaving(true);
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
                toast.warn("Could not find this precise address. Please drag the marker manually.");
            }
        } catch (err) {
            console.error("Geocoding error:", err);
            toast.error("Error searching for location.");
        } finally {
            setSaving(false);
        }
    };

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
                {/* Removed header as per user request for compactness */}

                <div className="location-grid">
                    {/* Address Form */}
                    <div className="space-y-6">
                        <div className="settings-group">
                            <label>Full Address</label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="settings-input"
                                placeholder="Ví dụ: 133 Đ. Trần Hưng Đạo, An Phú, Ninh Kiều, Cần Thơ"
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
                                border: '1px dashed #3b82f6',
                                borderRadius: '8px',
                                color: '#3b82f6',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Navigation size={18} /> Find Address on Map
                        </button>

                        <div style={{ margin: '15px 0' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Map Mode</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => setMapType('street')}
                                    style={{
                                        flex: 1, padding: '8px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer',
                                        background: mapType === 'street' ? '#3b82f6' : '#f8fafc',
                                        color: mapType === 'street' ? '#fff' : '#64748b',
                                        border: '1px solid',
                                        borderColor: mapType === 'street' ? '#3b82f6' : '#e2e8f0',
                                        transition: 'all 0.2s'
                                    }}
                                >Street</button>
                                <button
                                    onClick={() => setMapType('satellite')}
                                    style={{
                                        flex: 1, padding: '8px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer',
                                        background: mapType === 'satellite' ? '#3b82f6' : '#f8fafc',
                                        color: mapType === 'satellite' ? '#fff' : '#64748b',
                                        border: '1px solid',
                                        borderColor: mapType === 'satellite' ? '#3b82f6' : '#e2e8f0',
                                        transition: 'all 0.2s'
                                    }}
                                >Satellite</button>
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

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn-save-location"
                            style={{ width: '100%', marginTop: '20px' }}
                        >
                            {saving ? "Saving..." : <><Save size={20} /> Save Changes</>}
                        </button>

                    </div>

                    {/* Map Picker */}
                    <div className="map-picker-section">
                        <div className="map-card">
                            <MapContainer
                                key={`${position.lat}-${position.lng}-${mapType}`}
                                center={[position.lat, position.lng]}
                                zoom={18}
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
