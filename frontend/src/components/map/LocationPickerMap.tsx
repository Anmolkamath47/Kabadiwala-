import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Locate, Layers, Search, X, Loader2, Navigation } from 'lucide-react';
import { mapService, MapTileMode, GeocodeResult } from '../../services/mapService';

interface LocationPickerMapProps {
  initialCoords: [number, number]; // [lng, lat]
  onLocationChange: (coords: [number, number]) => void;
  onAddressResolved?: (address: string) => void;
  heightClass?: string;
}

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  initialCoords,
  onLocationChange,
  onAddressResolved,
  heightClass = 'h-80 sm:h-96',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const switchLayerRef = useRef<((mode: MapTileMode) => void) | null>(null);

  const [currentCoords, setCurrentCoords] = useState<[number, number]>(initialCoords);
  const [tileMode, setTileMode] = useState<MapTileMode>('street');
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [addressPreview, setAddressPreview] = useState<string>('');

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const [lng, lat] = initialCoords;

    if (!mapInstanceRef.current) {
      const { map, switchLayer } = mapService.createMap(
        mapContainerRef.current,
        { lat, lng },
        16,
        tileMode
      );

      switchLayerRef.current = switchLayer;
      mapInstanceRef.current = map;

      // Initial reverse geocode
      mapService.reverseGeocode(lat, lng).then((addr) => {
        setAddressPreview(addr);
        if (onAddressResolved) onAddressResolved(addr);
      });

      map.on('moveend', async () => {
        const center = map.getCenter();
        const newCoords: [number, number] = [
          Math.round(center.lng * 10000) / 10000,
          Math.round(center.lat * 10000) / 10000,
        ];
        setCurrentCoords(newCoords);
        onLocationChange(newCoords);

        // Auto reverse geocode address
        try {
          const resolved = await mapService.reverseGeocode(center.lat, center.lng);
          setAddressPreview(resolved);
          if (onAddressResolved) onAddressResolved(resolved);
        } catch {
          // ignore
        }
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Switch Layer
  const handleToggleLayer = () => {
    const nextMode: MapTileMode = tileMode === 'street' ? 'satellite' : 'street';
    setTileMode(nextMode);
    if (switchLayerRef.current) {
      switchLayerRef.current(nextMode);
    }
  };

  // High-accuracy GPS Locator
  const handleRecenterGPS = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        mapInstanceRef.current?.flyTo([lat, lng], 17, { duration: 1.2 });
        const newCoords: [number, number] = [lng, lat];
        setCurrentCoords(newCoords);
        onLocationChange(newCoords);

        const resolved = await mapService.reverseGeocode(lat, lng);
        setAddressPreview(resolved);
        if (onAddressResolved) onAddressResolved(resolved);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        mapInstanceRef.current?.flyTo([initialCoords[1], initialCoords[0]], 16);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Search places
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const results = await mapService.searchPlaces(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
    setIsSearchOpen(true);
  };

  const handleSelectSearchResult = (res: GeocodeResult) => {
    const [lng, lat] = res.coords;
    mapInstanceRef.current?.flyTo([lat, lng], 17, { duration: 1.2 });
    setCurrentCoords([lng, lat]);
    onLocationChange([lng, lat]);
    setAddressPreview(res.displayName);
    if (onAddressResolved) onAddressResolved(res.displayName);
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleZoom = (delta: number) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() + delta);
  };

  return (
    <div className={`relative w-full ${heightClass} rounded-3xl overflow-hidden border border-slate-200/90 shadow-card select-none`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-col gap-2 pointer-events-auto">
        <div className="flex items-center space-x-2">
          {/* Quick Search Bar */}
          <div className="relative flex-1 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 flex items-center px-3 py-2">
            <Search className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
            <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0 flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search area, landmark or sector..."
                className="w-full bg-transparent text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setIsSearchOpen(false);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 mr-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-emerald-600 animate-spin flex-shrink-0" />
            ) : (
              <button
                type="button"
                onClick={() => handleSearchSubmit()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl transition shadow-2xs flex-shrink-0"
              >
                Find
              </button>
            )}
          </div>

          {/* Map Layer Switcher Button */}
          <button
            type="button"
            onClick={handleToggleLayer}
            className="bg-white/95 backdrop-blur-md text-slate-700 hover:text-emerald-700 px-3 py-2 rounded-2xl shadow-lg border border-slate-200/80 flex items-center space-x-1.5 text-xs font-bold transition flex-shrink-0"
            title="Toggle Google Streets / Google Satellite"
          >
            <Layers className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline capitalize">
              {tileMode === 'street' ? 'Satellite' : 'Streets'}
            </span>
          </button>
        </div>

        {/* Autocomplete Search Dropdown */}
        {isSearchOpen && searchResults.length > 0 && (
          <div className="bg-white/98 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-200 p-1.5 max-h-48 overflow-y-auto space-y-1">
            {searchResults.map((res, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSearchResult(res)}
                className="p-2.5 rounded-xl hover:bg-emerald-50 cursor-pointer transition flex items-start space-x-2"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 text-left">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {res.displayName.split(',')[0]}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {res.displayName}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Center Pin Indicator */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-10 pointer-events-none flex flex-col items-center">
        {/* Pulse radar glow */}
        <div className="absolute top-0 w-14 h-14 rounded-full bg-emerald-500/20 animate-ping -translate-y-2"></div>

        {/* Pin Badge */}
        <div className="relative w-11 h-11 bg-gradient-to-tr from-emerald-700 to-emerald-500 rounded-full border-2 border-white shadow-2xl flex items-center justify-center text-white z-10 animate-bounce">
          <MapPin className="w-6 h-6 text-white" />
        </div>

        {/* Pin Ground Tip and Shadow */}
        <div className="w-3 h-3 bg-emerald-800 rotate-45 -mt-1.5 z-0"></div>
        <div className="w-3.5 h-1.5 bg-slate-900/40 rounded-full blur-xs mt-1"></div>
      </div>

      {/* Floating Instruction / Address Preview Pill */}
      <div className="absolute bottom-14 left-3 right-16 z-10 pointer-events-none">
        <div className="bg-slate-950/85 backdrop-blur-md text-white px-3.5 py-2 rounded-2xl shadow-xl border border-slate-700/60 max-w-sm">
          <div className="flex items-center space-x-1.5 text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
            <Navigation className="w-3 h-3" />
            <span>Doorstep Pickup Pin</span>
          </div>
          <div className="text-xs font-semibold text-slate-100 truncate mt-0.5">
            {addressPreview || 'Drag map to align your pickup point'}
          </div>
        </div>
      </div>

      {/* Right Action Floating Controls */}
      <div className="absolute bottom-3 right-3 z-10 flex flex-col space-y-2">
        {/* Zoom In */}
        <button
          type="button"
          onClick={() => handleZoom(1)}
          className="w-10 h-10 bg-white hover:bg-slate-50 text-slate-800 rounded-2xl shadow-lg border border-slate-200 flex items-center justify-center font-black text-lg transition active:scale-95"
          title="Zoom In"
        >
          +
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={() => handleZoom(-1)}
          className="w-10 h-10 bg-white hover:bg-slate-50 text-slate-800 rounded-2xl shadow-lg border border-slate-200 flex items-center justify-center font-black text-lg transition active:scale-95"
          title="Zoom Out"
        >
          -
        </button>

        {/* GPS Locate Me Button */}
        <button
          type="button"
          onClick={handleRecenterGPS}
          disabled={isLocating}
          className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-xl border border-emerald-500 flex items-center justify-center transition active:scale-95"
          title="Use High-Accuracy GPS"
        >
          <Locate className={`w-5 h-5 ${isLocating ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Coordinates HUD Badge */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
        <div className="bg-white/90 backdrop-blur text-slate-600 text-[10px] font-mono px-2 py-0.5 rounded-lg border border-slate-200 shadow-xs">
          GPS: {currentCoords[1].toFixed(4)}, {currentCoords[0].toFixed(4)}
        </div>
      </div>
    </div>
  );
};

