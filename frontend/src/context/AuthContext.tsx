import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, SavedAddress } from '../types';
import { authService } from '../services/authService';
import { socketService } from '../services/socketService';
import { reconcileCityCoordinates } from '../utils/geoUtils';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  selectedLocation: SavedAddress | null;
  setSelectedLocation: (loc: SavedAddress | null) => void;
  requestOtp: (phone: string) => Promise<{ message: string; demoOtp?: string }>;
  verifyOtpAndLogin: (phone: string, otp: string, name?: string) => Promise<{ isNewUser: boolean; isProfileCompleted: boolean; user: UserProfile }>;
  updateUserProfile: (updates: {
    name?: string;
    profileImage?: string;
    email?: string;
    isProfileCompleted?: boolean;
    currentLocation?: any;
  }) => Promise<UserProfile>;
  addSavedAddress: (addr: any) => Promise<void>;
  deleteSavedAddress: (locationId: string) => Promise<void>;
  setDefaultAddress: (locationId: string) => Promise<void>;
  detectCurrentLocation: () => Promise<SavedAddress | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('kabadiwala_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('kabadiwala_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<SavedAddress | null>(() => {
    const saved = localStorage.getItem('kabadiwala_pickup_location');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.address) {
          const healed = reconcileCityCoordinates(parsed.address, parsed.coordinates);
          if (
            !parsed.coordinates ||
            parsed.coordinates[0] !== healed[0] ||
            parsed.coordinates[1] !== healed[1]
          ) {
            parsed.coordinates = healed;
            localStorage.setItem('kabadiwala_pickup_location', JSON.stringify(parsed));
          }
          return parsed;
        }
      } catch {}
    }
    if (user?.savedLocations && user.savedLocations.length > 0) {
      const def = user.savedLocations.find((l) => l.isDefault) || user.savedLocations[0];
      const healed = reconcileCityCoordinates(def.address, def.coordinates);
      return { ...def, coordinates: healed };
    }
    // Default Delhi location
    return {
      label: 'Home',
      address: 'Connaught Place, Central Delhi, New Delhi - 110001',
      coordinates: [77.2150, 28.6250],
      isDefault: true,
    };
  });

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('kabadiwala_token');
      if (storedToken) {
        try {
          const profile = await authService.getMe();
          setUser(profile);
          localStorage.setItem('kabadiwala_user', JSON.stringify(profile));
          socketService.connect(storedToken);

          if (!selectedLocation && profile.savedLocations && profile.savedLocations.length > 0) {
            const defLoc = profile.savedLocations.find((l) => l.isDefault) || profile.savedLocations[0];
            const healed = reconcileCityCoordinates(defLoc.address, defLoc.coordinates);
            const healedLoc = { ...defLoc, coordinates: healed };
            setSelectedLocation(healedLoc);
            localStorage.setItem('kabadiwala_pickup_location', JSON.stringify(healedLoc));
          }
        } catch (error: any) {
          // Only logout if the server explicitly tells us the token is invalid/expired
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            console.warn('Session expired or invalid token, logging out');
            logout();
          } else {
            // Server might be booting or network glitch - preserve cached session
            console.warn('Server offline/reconnecting, preserving cached session');
            socketService.connect(storedToken);
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const handleSetSelectedLocation = (loc: SavedAddress | null) => {
    let finalLoc = loc;
    if (finalLoc && finalLoc.address) {
      const healed = reconcileCityCoordinates(finalLoc.address, finalLoc.coordinates);
      finalLoc = { ...finalLoc, coordinates: healed };
    }
    setSelectedLocation(finalLoc);
    if (finalLoc) {
      localStorage.setItem('kabadiwala_pickup_location', JSON.stringify(finalLoc));
    } else {
      localStorage.removeItem('kabadiwala_pickup_location');
    }
  };

  const requestOtp = async (phone: string) => {
    return authService.requestOtp(phone);
  };

  const verifyOtpAndLogin = async (
    phone: string,
    otp: string,
    name?: string
  ): Promise<{ isNewUser: boolean; isProfileCompleted: boolean; user: UserProfile }> => {
    setIsLoading(true);
    try {
      const data = await authService.verifyOtp(phone, otp, name);
      setToken(data.accessToken);
      setUser(data.user);
      localStorage.setItem('kabadiwala_token', data.accessToken);
      localStorage.setItem('kabadiwala_refresh_token', data.refreshToken);
      localStorage.setItem('kabadiwala_user', JSON.stringify(data.user));

      socketService.connect(data.accessToken);

      if (data.user.savedLocations && data.user.savedLocations.length > 0) {
        const defLoc = data.user.savedLocations.find((l) => l.isDefault) || data.user.savedLocations[0];
        handleSetSelectedLocation(defLoc);
      }

      setIsLoading(false);
      return {
        isNewUser: data.isNewUser,
        isProfileCompleted: !!data.user.isProfileCompleted,
        user: data.user,
      };
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const updateUserProfile = async (updates: {
    name?: string;
    profileImage?: string;
    email?: string;
    isProfileCompleted?: boolean;
    currentLocation?: any;
  }): Promise<UserProfile> => {
    const updated = await authService.updateProfile(updates);
    setUser(updated);
    localStorage.setItem('kabadiwala_user', JSON.stringify(updated));
    return updated;
  };

  const addSavedAddress = async (addr: any) => {
    const locations = await authService.addSavedLocation(addr);
    if (user) {
      const updatedUser = { ...user, savedLocations: locations };
      setUser(updatedUser);
      localStorage.setItem('kabadiwala_user', JSON.stringify(updatedUser));
    }
  };

  const deleteSavedAddress = async (locationId: string) => {
    const locations = await authService.deleteSavedLocation(locationId);
    if (user) {
      const updatedUser = { ...user, savedLocations: locations };
      setUser(updatedUser);
      localStorage.setItem('kabadiwala_user', JSON.stringify(updatedUser));

      // If the currently selected location was deleted, fallback to the new default or first remaining
      if (
        selectedLocation &&
        ((selectedLocation as any)._id === locationId || (selectedLocation as any).id === locationId)
      ) {
        const nextLoc = locations.find((l: any) => l.isDefault) || locations[0] || null;
        if (nextLoc) {
          handleSetSelectedLocation(nextLoc);
        } else {
          setSelectedLocation(null);
          localStorage.removeItem('kabadiwala_pickup_location');
        }
      }
    }
  };

  const setDefaultAddress = async (locationId: string) => {
    const locations = await authService.updateSavedLocation(locationId, { isDefault: true });
    if (user) {
      const updatedUser = { ...user, savedLocations: locations };
      setUser(updatedUser);
      localStorage.setItem('kabadiwala_user', JSON.stringify(updatedUser));

      const newDefault = locations.find((l: any) => l._id === locationId || (l as any).id === locationId) || locations[0];
      if (newDefault) {
        handleSetSelectedLocation(newDefault);
      }
    }
  };

  const detectCurrentLocation = async (): Promise<SavedAddress | null> => {
    if (typeof window === 'undefined' || !navigator.geolocation) return null;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = Math.round(position.coords.latitude * 100000) / 100000;
          const lng = Math.round(position.coords.longitude * 100000) / 100000;

          let addressName = `Current Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
              { headers: { 'Accept-Language': 'en' } }
            );
            const data = await res.json();
            if (data?.address) {
              const locality = data.address.suburb || data.address.neighbourhood || data.address.city_district || data.address.city || '';
              const city = data.address.city || data.address.town || data.address.state || '';
              const parts = [locality, city].filter(Boolean);
              if (parts.length > 0) addressName = parts.join(', ');
            }
          } catch {
            // Ignored
          }

          const gpsAddress: SavedAddress = {
            label: 'Home',
            address: addressName,
            coordinates: [lng, lat],
            isDefault: true,
          };
          handleSetSelectedLocation(gpsAddress);
          resolve(gpsAddress);
        },
        () => resolve(null),
        { timeout: 8000, enableHighAccuracy: true }
      );
    });
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('kabadiwala_token');
    localStorage.removeItem('kabadiwala_refresh_token');
    localStorage.removeItem('kabadiwala_user');
    socketService.disconnect();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        selectedLocation,
        setSelectedLocation: handleSetSelectedLocation,
        requestOtp,
        verifyOtpAndLogin,
        updateUserProfile,
        addSavedAddress,
        deleteSavedAddress,
        setDefaultAddress,
        detectCurrentLocation,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
