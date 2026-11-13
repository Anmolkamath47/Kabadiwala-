import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LocationPickerMap } from '../components/map/LocationPickerMap';
import { SavedAddress } from '../types';
import { reconcileCityCoordinates } from '../utils/geoUtils';
import {
  ArrowLeft,
  MapPin,
  Home,
  Briefcase,
  Check,
  Plus,
  Navigation,
  Trash2,
  Loader2,
} from 'lucide-react';

export const LocationSelectScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, selectedLocation, setSelectedLocation, addSavedAddress, deleteSavedAddress } = useAuth();

  const [coords, setCoords] = useState<[number, number]>(() => {
    return selectedLocation?.coordinates || [77.2150, 28.6250];
  });
  const [addressText, setAddressText] = useState(
    selectedLocation?.address || 'Connaught Place, Central Delhi, New Delhi - 110001'
  );
  const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [landmark, setLandmark] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSelectExisting = (loc: SavedAddress) => {
    setSelectedLocation(loc);
    navigate('/');
  };

  const handleDeleteExisting = async (e: React.MouseEvent, loc: SavedAddress) => {
    e.stopPropagation();
    const id = loc._id || (loc as any).id;
    if (!id) return;
    if (!window.confirm(`Delete address "${loc.label} - ${loc.address}"?`)) return;

    setDeletingId(id);
    try {
      await deleteSavedAddress(id);
    } catch (err) {
      console.error('Failed to delete address', err);
      alert('Could not delete address. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveAndConfirm = async () => {
    setIsSaving(true);
    const healedCoords = reconcileCityCoordinates(addressText, coords);
    const newAddress: SavedAddress = {
      label,
      address: addressText,
      landmark: landmark || undefined,
      coordinates: healedCoords,
      isDefault: true,
    };

    try {
      if (user) {
        await addSavedAddress(newAddress);
      }
      setSelectedLocation(newAddress);
      navigate('/');
    } catch {
      setSelectedLocation(newAddress);
      navigate('/');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUseCurrentGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const newCoords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setCoords(newCoords);
        setAddressText(`Near GPS Coordinates (${newCoords[1].toFixed(4)}, ${newCoords[0].toFixed(4)})`);
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto flex flex-col justify-between shadow-2xl">
      {/* Header */}
      <div className="p-4 bg-white border-b border-slate-200 flex items-center space-x-3 sticky top-0 z-20">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-900">Select Scrap Pickup Location</h1>
          <p className="text-[11px] text-slate-500">Dealers will collect scrap at this doorstep</p>
        </div>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Interactive Map Picker */}
        <LocationPickerMap
          initialCoords={coords}
          onLocationChange={(c) => setCoords(c)}
          onAddressResolved={(addr) => setAddressText(addr)}
        />

        {/* GPS Quick Button */}
        <button
          type="button"
          onClick={handleUseCurrentGPS}
          className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition shadow-2xs"
        >
          <Navigation className="w-4 h-4 text-emerald-600" />
          <span>Use Current GPS Location</span>
        </button>

        {/* Address Input Details */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-card">
          <div className="text-xs font-bold text-slate-800">Enter Detailed Address</div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              House / Flat / Street / Area
            </label>
            <input
              type="text"
              value={addressText}
              onChange={(e) => {
                const val = e.target.value;
                setAddressText(val);
                const healed = reconcileCityCoordinates(val, coords);
                if (healed[0] !== coords[0] || healed[1] !== coords[1]) {
                  setCoords(healed);
                }
              }}
              placeholder="e.g. Flat 304, Green Heights, Sector 14"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Landmark (Optional)
            </label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Near Mother Dairy / Metro Pillar 42"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-none transition"
            />
          </div>

          {/* Label selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
              Save As
            </label>
            <div className="flex space-x-2">
              {(['Home', 'Work', 'Other'] as const).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setLabel(tag)}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 border transition ${
                    label === tag
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tag === 'Home' && <Home className="w-3.5 h-3.5" />}
                  {tag === 'Work' && <Briefcase className="w-3.5 h-3.5" />}
                  {tag === 'Other' && <MapPin className="w-3.5 h-3.5" />}
                  <span>{tag}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Saved Addresses List */}
        {user?.savedLocations && user.savedLocations.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-800">Saved Addresses</div>
            {user.savedLocations.map((loc, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectExisting(loc)}
                className="bg-white p-3 rounded-2xl border border-slate-200 hover:border-emerald-500 cursor-pointer flex items-center justify-between transition shadow-2xs"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    {loc.label === 'Home' ? (
                      <Home className="w-4 h-4" />
                    ) : (
                      <Briefcase className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900">{loc.label}</div>
                    <div className="text-[11px] text-slate-500 truncate">{loc.address}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  {selectedLocation?.address === loc.address && (
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteExisting(e, loc)}
                    disabled={deletingId === (loc._id || (loc as any).id)}
                    className="w-8 h-8 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors disabled:opacity-50"
                    title="Delete address"
                  >
                    {deletingId === (loc._id || (loc as any).id) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Confirm Button */}
      <div className="p-4 bg-white border-t border-slate-200 sticky bottom-0 z-20">
        <button
          onClick={handleSaveAndConfirm}
          disabled={isSaving || !addressText}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center space-x-2 transition shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Confirm Pickup Location</span>
        </button>
      </div>
    </div>
  );
};
