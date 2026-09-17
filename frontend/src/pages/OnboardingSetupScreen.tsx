import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LocationPickerMap } from '../components/map/LocationPickerMap';
import { mapService } from '../services/mapService';
import { SavedAddress } from '../types';
import {
  MapPin,
  Locate,
  Navigation,
  User,
  Camera,
  Check,
  ArrowRight,
  Sparkles,
  Home,
  Briefcase,
  Store,
  Upload,
  ShieldCheck,
} from 'lucide-react';

export const OnboardingSetupScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUserProfile, addSavedAddress, setSelectedLocation } = useAuth();

  // Wizard Step: 1 = Location, 2 = Profile
  const [step, setStep] = useState<1 | 2>(1);

  // --- Location State ---
  const [coords, setCoords] = useState<[number, number]>(() => {
    return user?.currentLocation?.coordinates || [77.2150, 28.6250];
  });
  const [addressText, setAddressText] = useState(
    user?.currentLocation?.address || 'Connaught Place, Central Delhi, New Delhi'
  );
  const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [landmark, setLandmark] = useState('');
  const [locationMode, setLocationMode] = useState<'choice' | 'map'>('choice');
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);

  // --- Profile State ---
  const [name, setName] = useState(
    user?.name && user.name !== 'Scrap Seller' ? user.name : ''
  );
  const [email, setEmail] = useState(user?.email || '');
  const [profileImage, setProfileImage] = useState<string>(user?.profileImage || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live GPS locator
  const handleUseLiveLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newCoords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setCoords(newCoords);
        try {
          const resolvedAddress = await mapService.reverseGeocode(
            pos.coords.latitude,
            pos.coords.longitude
          );
          setAddressText(resolvedAddress);
        } catch {
          setAddressText(`GPS Location (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        }
        setIsLocatingGPS(false);
        setLocationMode('map');
      },
      () => {
        setIsLocatingGPS(false);
        alert('Could not retrieve your live location. Please mark on map manually.');
        setLocationMode('map');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Image upload handling with compression
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 250;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setProfileImage(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Step 1: Proceed to Profile
  const handleConfirmLocationStep = () => {
    if (!addressText.trim()) {
      alert('Please enter or verify your pickup address.');
      return;
    }
    setStep(2);
  };

  // Step 2: Save Profile & Complete Onboarding
  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const savedAddressObj: SavedAddress = {
        label,
        address: addressText,
        landmark: landmark.trim() || undefined,
        coordinates: coords,
        isDefault: true,
      };

      // 1. Add saved address
      await addSavedAddress(savedAddressObj);
      setSelectedLocation(savedAddressObj);

      // 2. Update user profile
      await updateUserProfile({
        name: name.trim(),
        profileImage: profileImage || undefined,
        email: email.trim() || undefined,
        isProfileCompleted: true,
        currentLocation: {
          coordinates: coords,
          address: addressText,
        },
      });

      // 3. Go to Home screen
      navigate('/', { replace: true });
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between max-w-md mx-auto shadow-2xl relative">
      {/* Header Bar */}
      <div className="p-4 bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img
              src="/logo.png"
              alt="Scrapwala"
              className="w-8 h-8 rounded-xl object-contain bg-white shadow-xs border border-slate-100 p-0.5"
            />
            <div>
              <h1 className="text-sm font-black text-slate-900">Welcome to Scrapwala</h1>
              <p className="text-[11px] text-slate-500">Quick 2-Step Setup</p>
            </div>
          </div>

          {/* Stepper Pill */}
          <div className="bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
            Step {step} of 2
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
          <div
            className="bg-emerald-600 h-full transition-all duration-300"
            style={{ width: step === 1 ? '50%' : '100%' }}
          ></div>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        {/* ================= STEP 1: PICKUP LOCATION ================= */}
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Where should scrap be collected?
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Give your live GPS location or mark your exact doorstep on the real map.
              </p>
            </div>

            {/* Choice Cards (if not already opened map) */}
            {locationMode === 'choice' && (
              <div className="space-y-3 pt-2">
                {/* Option 1: Live GPS Location */}
                <div
                  onClick={handleUseLiveLocation}
                  className="bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white p-5 rounded-3xl cursor-pointer shadow-lg transition transform active:scale-[0.98] relative overflow-hidden"
                >
                  <div className="relative z-10 flex items-start justify-between">
                    <div className="space-y-2 max-w-[240px]">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                        <Locate className={`w-6 h-6 ${isLocatingGPS ? 'animate-spin' : ''}`} />
                      </div>
                      <h3 className="text-base font-extrabold">Use Live GPS Location</h3>
                      <p className="text-xs text-emerald-100 leading-relaxed">
                        Detect your current doorstep with high accuracy in one tap.
                      </p>
                    </div>
                    <span className="text-xs bg-white/20 font-bold px-3 py-1 rounded-full text-white backdrop-blur-xs">
                      {isLocatingGPS ? 'Locating...' : 'Instant'}
                    </span>
                  </div>
                </div>

                {/* Option 2: Mark on Map */}
                <div
                  onClick={() => setLocationMode('map')}
                  className="bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200 hover:border-emerald-500 p-5 rounded-3xl cursor-pointer shadow-card transition transform active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 max-w-[240px]">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-extrabold">Mark on Map</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Drag the pin on satellite or street view and search specific areas.
                      </p>
                    </div>
                    <span className="text-xs bg-slate-100 font-bold px-3 py-1 rounded-full text-slate-700">
                      Interactive Map
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Map Picker Section */}
            {locationMode === 'map' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Real Interactive Map</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleUseLiveLocation}
                    className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center space-x-1"
                  >
                    <Locate className="w-3 h-3" />
                    <span>Re-detect GPS</span>
                  </button>
                </div>

                <LocationPickerMap
                  initialCoords={coords}
                  onLocationChange={(newCoords) => setCoords(newCoords)}
                  onAddressResolved={(addr) => setAddressText(addr)}
                  heightClass="h-72 sm:h-80"
                />

                {/* Address Form Inputs */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Scrap Collection Address
                    </label>
                    <textarea
                      rows={2}
                      value={addressText}
                      onChange={(e) => setAddressText(e.target.value)}
                      placeholder="House/flat no., street, locality, landmark"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white rounded-2xl text-xs font-semibold text-slate-900 outline-none transition resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Opposite Community Hall / Metro Pillar 44"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                      Save Address As
                    </label>
                    <div className="flex space-x-2">
                      {(['Home', 'Work', 'Other'] as const).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setLabel(tag)}
                          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 border transition ${
                            label === tag
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {tag === 'Home' && <Home className="w-3.5 h-3.5" />}
                          {tag === 'Work' && <Briefcase className="w-3.5 h-3.5" />}
                          {tag === 'Other' && <Store className="w-3.5 h-3.5" />}
                          <span>{tag}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmLocationStep}
                  disabled={!addressText.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-3.5 px-4 rounded-2xl text-sm flex items-center justify-center space-x-2 transition shadow-md"
                >
                  <span>Confirm Location & Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 2: PROFILE DETAILS ================= */}
        {step === 2 && (
          <form onSubmit={handleCompleteOnboarding} className="space-y-4 animate-fadeIn">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Setup your profile
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Add your name and photo so scrap dealers can identify you during doorstep pickup.
              </p>
            </div>

            {/* Profile Picture Upload & Dynamic Letter DP */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-card text-center space-y-4">
              <div className="relative w-24 h-24 mx-auto">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile Avatar"
                    className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500 shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-700 to-teal-800 text-white flex items-center justify-center text-4xl font-black shadow-xl border-4 border-white tracking-tight">
                    {name.trim() ? name.trim().charAt(0).toUpperCase() : <User className="w-10 h-10" />}
                  </div>
                )}

                {/* Upload Button overlay badge */}
                <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center cursor-pointer shadow-md border-2 border-white transition active:scale-95" title="Upload Photo">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer inline-flex items-center space-x-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload custom photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>

                {profileImage && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setProfileImage('')}
                      className="text-[11px] font-semibold text-rose-500 hover:underline"
                    >
                      Use first letter DP instead
                    </button>
                  </div>
                )}

                <p className="text-[11px] text-slate-400">
                  {profileImage
                    ? 'Photo uploaded · Click camera to change'
                    : `First letter (${name.trim() ? name.trim().charAt(0).toUpperCase() : 'Letter'}) will be used as your DP`}
                </p>
              </div>
            </div>

            {/* Profile Inputs */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white rounded-xl text-xs font-bold text-slate-900 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address <span className="text-slate-400 font-normal">(Optional, for digital receipt)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rahul@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white rounded-xl text-xs font-medium text-slate-900 outline-none transition"
                />
              </div>

              {/* Confirmed Location Summary */}
              <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-2xl flex items-start space-x-2.5">
                <MapPin className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 text-left">
                  <div className="text-xs font-bold text-emerald-950">{label} Pickup Address</div>
                  <div className="text-[11px] text-emerald-800 line-clamp-2 mt-0.5">{addressText}</div>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3 rounded-2xl">
                {errorMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition"
              >
                Back
              </button>

              <button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-3.5 px-4 rounded-2xl text-sm flex items-center justify-center space-x-2 transition shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Saving Profile...' : 'Save & Start Selling Scrap'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer Security Badges */}
      <div className="p-3 bg-white border-t border-slate-200/80 text-center">
        <div className="flex items-center justify-center space-x-1.5 text-slate-500 text-[11px] font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Verified Scrapwala Network · Privacy Protected</span>
        </div>
      </div>
    </div>
  );
};
