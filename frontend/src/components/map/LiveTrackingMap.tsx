import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  mapService,
  MapCoordinates,
  MapTileMode,
  DrivingRouteResult,
} from '../../services/mapService';
import { DealerLiveLocation } from '../../types';
import {
  Clock,
  Layers,
  Compass,
  ArrowUpRight,
  ArrowUpLeft,
  ArrowUp,
  RotateCcw,
} from 'lucide-react';
import { getVehicleDetails } from '../../utils/vehicleUtils';

interface LiveTrackingMapProps {
  pickupCoords: [number, number]; // [lng, lat]
  dealerLocation?: DealerLiveLocation | null;
  pickupAddress?: string;
  dealerName?: string;
  dealerVehicle?: string;
}

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  pickupCoords,
  dealerLocation,
  pickupAddress = 'Your Pickup Location',
  dealerName = 'Scrap Collector',
  dealerVehicle = 'Electric Scrap Loader',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const switchLayerRef = useRef<((mode: MapTileMode) => void) | null>(null);
  const dealerMarkerRef = useRef<L.Marker | null>(null);
  const consumerMarkerRef = useRef<L.Marker | null>(null);
  const routeGroupRef = useRef<L.FeatureGroup | null>(null);

  const prevDealerCoordsRef = useRef<[number, number] | null>(null);
  const lastRouteFetchCoordsRef = useRef<[number, number] | null>(null);
  const lastRouteFetchTimeRef = useRef<number>(0);
  const hasInitialFitRef = useRef<boolean>(false);

  const [tileMode, setTileMode] = useState<MapTileMode>('street');
  const [routeInfo, setRouteInfo] = useState<DrivingRouteResult | null>(null);

  const parseCoord = (val: any, fallback: number): number => {
    if (typeof val === 'number' && !isNaN(val)) return val;
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      if (!isNaN(parsed)) return parsed;
    }
    return fallback;
  };

  const safeLng = parseCoord(pickupCoords?.[0], 77.5020);
  const safeLat = parseCoord(pickupCoords?.[1], 13.0450);

  const vehicleDetails = getVehicleDetails(dealerVehicle);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const consumerPoint: MapCoordinates = {
      lng: safeLng,
      lat: safeLat,
    };

    let timer: any = null;
    let resizeObserver: ResizeObserver | null = null;

    if (!mapInstanceRef.current) {
      const { map, switchLayer } = mapService.createMap(
        mapContainerRef.current,
        consumerPoint,
        15,
        tileMode
      );
      switchLayerRef.current = switchLayer;
      consumerMarkerRef.current = mapService.createConsumerMarker(
        map,
        consumerPoint,
        pickupAddress
      );
      mapInstanceRef.current = map;

      // Force size recalculation on mobile mount
      timer = setTimeout(() => {
        map.invalidateSize();
      }, 200);

      if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          map.invalidateSize();
        });
        resizeObserver.observe(mapContainerRef.current);
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (resizeObserver) resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        dealerMarkerRef.current = null;
        consumerMarkerRef.current = null;
        routeGroupRef.current = null;
        hasInitialFitRef.current = false;
      }
    };
  }, [safeLng, safeLat, pickupAddress]);

  // Real-Time Dealer Marker Movement & Throttled Route Calculation
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const consumerPoint: MapCoordinates = {
      lng: safeLng,
      lat: safeLat,
    };

    // Determine actual coordinates
    const hasValidCoords =
      Array.isArray(dealerLocation?.coordinates) &&
      dealerLocation.coordinates.length === 2 &&
      dealerLocation.coordinates[0] !== 0 &&
      !isNaN(dealerLocation.coordinates[0]);

    const dealerCoords: [number, number] = hasValidCoords
      ? dealerLocation!.coordinates
      : [safeLng + 0.007, safeLat + 0.006];

    const dealerPoint: MapCoordinates = {
      lng: dealerCoords[0],
      lat: dealerCoords[1],
    };

    // Calculate heading: prioritize device GPS heading, then bearing between real consecutive pings
    let heading = dealerLocation?.heading || 0;
    if (!heading && prevDealerCoordsRef.current) {
      heading = mapService.calculateBearing(
        [prevDealerCoordsRef.current[1], prevDealerCoordsRef.current[0]],
        [dealerCoords[1], dealerCoords[0]]
      );
    }
    if (!heading) heading = 45;
    prevDealerCoordsRef.current = dealerCoords;

    const speed = dealerLocation?.speed || 22;

    // 1. INSTANT MARKER POSITION UPDATE (0ms latency, does not wait on network or OSRM)
    if (!dealerMarkerRef.current) {
      dealerMarkerRef.current = mapService.createDealerMarker(
        map,
        dealerPoint,
        dealerName,
        heading,
        speed,
        dealerVehicle
      );
    } else {
      mapService.updateDealerMarker(
        dealerMarkerRef.current,
        dealerPoint,
        heading,
        speed,
        dealerVehicle
      );
    }

    // 2. Initial camera framing once both customer and dealer are on map
    if (!hasInitialFitRef.current) {
      mapService.fitBounds(map, [consumerPoint, dealerPoint]);
      hasInitialFitRef.current = true;
    }

    // 3. Throttled & Cached OSRM Road Route Fetching
    // Only re-fetch if route is not loaded yet, or dealer moved > 75m, or > 15s elapsed
    const now = Date.now();
    const distSinceLastFetch = lastRouteFetchCoordsRef.current
      ? mapService.calculateDirectDistance(
          { lng: lastRouteFetchCoordsRef.current[0], lat: lastRouteFetchCoordsRef.current[1] },
          dealerPoint
        )
      : 999;
    const timeSinceLastFetch = now - lastRouteFetchTimeRef.current;

    const shouldFetchRoute =
      !routeInfo || distSinceLastFetch > 0.075 || (timeSinceLastFetch > 15000 && distSinceLastFetch > 0.02);

    if (shouldFetchRoute) {
      lastRouteFetchCoordsRef.current = dealerCoords;
      lastRouteFetchTimeRef.current = now;

      mapService
        .fetchDrivingRoute(dealerPoint, consumerPoint)
        .then((route) => {
          setRouteInfo(route);
          if (routeGroupRef.current) {
            routeGroupRef.current.remove();
          }
          routeGroupRef.current = mapService.drawRoute(map, route.coordinates);
        })
        .catch((err) => {
          console.warn('Road route sync skipped, keeping current route polyline:', err);
        });
    }
  }, [dealerLocation, safeLng, safeLat, dealerName, dealerVehicle]);

  // Layer toggle
  const handleToggleLayer = () => {
    const nextMode: MapTileMode = tileMode === 'street' ? 'satellite' : 'street';
    setTileMode(nextMode);
    if (switchLayerRef.current) {
      switchLayerRef.current(nextMode);
    }
  };

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const consumerPoint: MapCoordinates = { lng: safeLng, lat: safeLat };
    const dealerCoords =
      Array.isArray(dealerLocation?.coordinates) &&
      dealerLocation.coordinates.length === 2
        ? dealerLocation.coordinates
        : [safeLng + 0.007, safeLat + 0.006];
    const dealerPoint: MapCoordinates = {
      lng: dealerCoords[0],
      lat: dealerCoords[1],
    };

    mapService.fitBounds(map, [consumerPoint, dealerPoint]);
  };

  const distanceKm = routeInfo?.distanceKm || dealerLocation?.distanceKm || 1.4;
  const etaMins = routeInfo?.durationMins || dealerLocation?.etaMinutes || 5;
  const currentSpeed = dealerLocation?.speed || 24;

  const nextStep = routeInfo?.steps?.[0]?.instruction || 'Approaching Pickup Lane';
  const isTurnLeft = routeInfo?.steps?.[0]?.modifier?.includes('left');

  return (
    <div className="relative w-full h-[360px] sm:h-96 min-h-[340px] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 select-none">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Realistic Turn-By-Turn Highway Navigation HUD Banner */}
      <div className="absolute top-3 left-3 right-3 z-10">
        <div className="bg-gradient-to-r from-emerald-950 via-slate-950 to-emerald-950 text-white rounded-2xl p-2.5 sm:p-3 shadow-2xl border border-emerald-500/40 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            {/* Turn maneuver indicator based on actual route step */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-md">
              {isTurnLeft ? (
                <ArrowUpLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
              ) : routeInfo?.steps?.[0]?.modifier?.includes('right') ? (
                <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
              ) : (
                <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 text-[11px] font-bold text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="truncate">{nextStep}</span>
              </div>
              <div className="text-xs font-black text-white truncate mt-0.5 flex items-center space-x-1.5">
                <span>{vehicleDetails.emoji}</span>
                <span className="truncate">{dealerName}</span>
                <span className="text-[10px] text-emerald-300 font-semibold truncate">
                  ({vehicleDetails.name})
                </span>
              </div>
            </div>
          </div>

          {/* Quick HUD Metrics */}
          <div className="flex items-center space-x-2 sm:space-x-3 text-right flex-shrink-0 ml-2">
            <div className="hidden sm:block">
              <div className="text-[10px] text-emerald-400 font-bold uppercase">Speed</div>
              <div className="text-xs font-extrabold text-white">{currentSpeed} km/h</div>
            </div>
            <div className="bg-white/10 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border border-white/10">
              <div className="text-[10px] text-slate-300 font-semibold flex items-center justify-end space-x-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>ETA</span>
              </div>
              <div className="text-xs sm:text-sm font-black text-emerald-300">{etaMins} mins</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Action Buttons */}
      <div className="absolute bottom-3 right-3 z-10 flex flex-col space-y-2">
        {/* Layer Switcher (Google Streets vs Google Satellite) */}
        <button
          type="button"
          onClick={handleToggleLayer}
          className="px-3 h-9 sm:h-10 bg-slate-900/90 backdrop-blur-md hover:bg-slate-800 text-white rounded-2xl shadow-xl border border-slate-700 flex items-center space-x-1.5 text-xs font-bold transition active:scale-95"
          title="Toggle Google Streets / Google Satellite"
        >
          <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
          <span className="capitalize">{tileMode === 'street' ? 'Satellite' : 'Streets'}</span>
        </button>

        {/* Recenter Camera */}
        <button
          type="button"
          onClick={handleRecenter}
          className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-xl border border-emerald-500 flex items-center justify-center transition active:scale-95 ml-auto"
          title="Recenter Navigation"
        >
          <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Live Route Distance Indicator Pill */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none max-w-[calc(100%-8.5rem)]">
        <div className="bg-slate-950/90 backdrop-blur-md text-white px-2.5 sm:px-3 py-1.5 rounded-xl shadow-lg border border-slate-700 flex items-center space-x-1.5 text-[11px] sm:text-xs font-bold truncate">
          <Compass
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 animate-spin flex-shrink-0"
            style={{ animationDuration: '6s' }}
          />
          <span className="truncate">{distanceKm} km away<span className="hidden sm:inline"> · Live Road Navigation</span></span>
        </div>
      </div>
    </div>
  );
};
