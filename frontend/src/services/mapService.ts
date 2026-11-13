import L from 'leaflet';
import { getVehicleDetails } from '../utils/vehicleUtils';

export interface MapCoordinates {
  lat: number;
  lng: number;
}

export type MapTileMode = 'street' | 'satellite';

export interface GeocodeResult {
  displayName: string;
  address: {
    road?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    state?: string;
    postcode?: string;
  };
  coords: [number, number]; // [lng, lat]
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  modifier?: string;
  type?: string;
}

export interface DrivingRouteResult {
  coordinates: [number, number][]; // [lat, lng] array along actual roads
  distanceKm: number;
  durationMins: number;
  steps: RouteStep[];
}

export interface IMapProvider {
  createMap(
    elementOrId: string | HTMLElement,
    center: MapCoordinates,
    zoom?: number,
    tileMode?: MapTileMode
  ): { map: L.Map; switchLayer: (mode: MapTileMode) => void };
  createConsumerMarker(map: L.Map, coords: MapCoordinates, title?: string): L.Marker;
  createDealerMarker(
    map: L.Map,
    coords: MapCoordinates,
    title?: string,
    heading?: number,
    speed?: number
  ): L.Marker;
  drawRoute(map: L.Map, coordinates: [number, number][]): L.FeatureGroup;
  fetchDrivingRoute(start: MapCoordinates, end: MapCoordinates): Promise<DrivingRouteResult>;
  fitBounds(map: L.Map, points: MapCoordinates[]): void;
  reverseGeocode(lat: number, lng: number): Promise<string>;
  searchPlaces(query: string): Promise<GeocodeResult[]>;
}

export class LeafletMapProvider implements IMapProvider {
  createMap(
    elementOrId: string | HTMLElement,
    center: MapCoordinates,
    zoom: number = 15,
    initialMode: MapTileMode = 'street'
  ): { map: L.Map; switchLayer: (mode: MapTileMode) => void } {
    const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (el && (el as any)._leaflet_id) {
      delete (el as any)._leaflet_id;
    }

    const map = L.map(elementOrId, {
      zoomControl: false,
      attributionControl: false,
    }).setView([center.lat, center.lng], zoom);

    // Google Maps Roadmap / Clean Streets (100% Free, Official Raster Tiles, Zero Watermarks)
    const googleStreets = L.tileLayer(
      'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 21,
      }
    );

    // Google Maps Satellite Hybrid (Photorealistic Satellite Imagery with Road & Landmark Labels)
    const googleSatellite = L.tileLayer(
      'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20,
      }
    );

    // Active layer tracking
    let currentMode: MapTileMode = initialMode;
    if (initialMode === 'satellite') {
      googleSatellite.addTo(map);
    } else {
      googleStreets.addTo(map);
    }

    const switchLayer = (mode: MapTileMode) => {
      if (mode === currentMode) return;
      if (mode === 'satellite') {
        map.removeLayer(googleStreets);
        googleSatellite.addTo(map);
      } else {
        map.removeLayer(googleSatellite);
        googleStreets.addTo(map);
      }
      currentMode = mode;
    };

    return { map, switchLayer };
  }

  createConsumerMarker(map: L.Map, coords: MapCoordinates, title: string = 'Pickup Location'): L.Marker {
    const consumerIcon = L.divIcon({
      className: 'custom-consumer-pin-wrap',
      html: `
        <div class="relative flex items-center justify-center select-none" style="width: 52px; height: 52px;">
          <!-- Soft green concentric delivery zone on the ground (matching Zomato reference) -->
          <div class="absolute w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 animate-pulse"></div>
          <!-- Black circular house pin -->
          <div class="relative w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center border-2 border-white shadow-xl z-10">
            <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [52, 52],
      iconAnchor: [26, 26],
      popupAnchor: [0, -26],
    });

    const marker = L.marker([coords.lat, coords.lng], { icon: consumerIcon }).addTo(map);
    marker.bindPopup(`
      <div style="font-family: system-ui, sans-serif; padding: 4px;">
        <strong style="color: #0f172a; font-size: 13px;">📍 ${title}</strong>
        <div style="font-size: 11px; color: #475569; margin-top: 2px;">Your doorstep scrap pickup point</div>
      </div>
    `);
    return marker;
  }

  buildDealerVehicleIcon(
    vehicleType?: string,
    heading: number = 0,
    speed?: number
  ): L.DivIcon {
    const safeHeading = heading || 0;
    const vehicle = getVehicleDetails(vehicleType);

    return L.divIcon({
      className: 'custom-dealer-pin-wrap',
      html: `
        <div class="dealer-live-vehicle-marker relative flex items-center justify-center select-none" style="pointer-events: auto; width: 56px; height: 86px;">
          <!-- Rotating Photorealistic Top-Down Vehicle Model (Oriented along road heading) -->
          <div class="dealer-vehicle-rotating-wrap relative flex items-center justify-center pointer-events-none" style="transform: rotate(${safeHeading}deg); transform-origin: center center; transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1); filter: drop-shadow(0 5px 8px rgba(0,0,0,0.38));">
            ${vehicle.topDownSvgHtml}
          </div>
        </div>
      `,
      iconSize: [56, 86],
      iconAnchor: [28, 43],
      popupAnchor: [0, -43],
    });
  }

  createDealerMarker(
    map: L.Map,
    coords: MapCoordinates,
    title: string = 'Dealer Vehicle',
    heading: number = 0,
    speed: number = 22,
    vehicleType?: string
  ): L.Marker {
    const dealerIcon = this.buildDealerVehicleIcon(vehicleType, heading, speed);
    const vehicle = getVehicleDetails(vehicleType);

    const marker = L.marker([coords.lat, coords.lng], { icon: dealerIcon }).addTo(map);
    marker.bindPopup(`
      <div style="font-family: system-ui, sans-serif; padding: 6px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 16px;">${vehicle.emoji}</span>
          <strong style="color: #0f172a; font-size: 13px;">${title}</strong>
        </div>
        <div style="font-size: 11px; font-weight: 700; color: #059669; margin-top: 2px;">
          ${vehicle.badge}
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: 1px;">
          Moving live towards your pickup location
        </div>
      </div>
    `);
    return marker;
  }

  updateDealerMarker(
    marker: L.Marker,
    coords: MapCoordinates,
    heading: number = 0,
    speed: number = 22,
    vehicleType?: string
  ): void {
    // 1. Move the Leaflet marker coordinates immediately
    marker.setLatLng([coords.lat, coords.lng]);

    // 2. High performance in-place DOM update without resetting icon / DOM tree
    const el = marker.getElement();
    if (el) {
      const rotatingWrap = el.querySelector<HTMLElement>('.dealer-vehicle-rotating-wrap');
      if (rotatingWrap) {
        rotatingWrap.style.transform = `rotate(${heading || 0}deg)`;
      }
    } else {
      const updatedIcon = this.buildDealerVehicleIcon(vehicleType, heading);
      marker.setIcon(updatedIcon);
    }
  }

  // Fetch actual driving road polyline and turn steps using free OSRM Routing Engine
  async fetchDrivingRoute(start: MapCoordinates, end: MapCoordinates): Promise<DrivingRouteResult> {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('OSRM routing failed');
      const data = await res.json();

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No driving route returned by OSRM');
      }

      const route = data.routes[0];
      // OSRM coordinates are [lng, lat]; convert to Leaflet [lat, lng]
      const coordinates: [number, number][] = route.geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]] as [number, number]
      );
      const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
      const durationMins = Math.max(1, Math.round(route.duration / 60));

      const steps: RouteStep[] = (route.legs?.[0]?.steps || []).map((s: any) => {
        let instruction = s.name ? `Turn onto ${s.name}` : 'Continue on road';
        if (s.maneuver?.type === 'depart') {
          instruction = `Head towards destination on ${s.name || 'road'}`;
        } else if (s.maneuver?.type === 'arrive') {
          instruction = 'Arrive at customer doorstep';
        } else if (s.maneuver?.modifier) {
          const mod = s.maneuver.modifier.replace('-', ' ');
          instruction = `Turn ${mod} ${s.name ? 'onto ' + s.name : ''}`.trim();
        }
        return {
          instruction,
          distanceMeters: Math.round(s.distance || 0),
          modifier: s.maneuver?.modifier,
          type: s.maneuver?.type,
        };
      });

      return { coordinates, distanceKm, durationMins, steps };
    } catch (err) {
      console.warn('OSRM router unavailable, using straight fallback:', err);
      // Resilient fallback: direct line with intermediate points
      const midLat = (start.lat + end.lat) / 2;
      const midLng = (start.lng + end.lng) / 2;
      const directDist = this.calculateDirectDistance(start, end);
      return {
        coordinates: [
          [start.lat, start.lng],
          [midLat, midLng],
          [end.lat, end.lng],
        ],
        distanceKm: Math.round(directDist * 10) / 10,
        durationMins: Math.max(2, Math.round((directDist / 25) * 60)),
        steps: [{ instruction: 'Head towards customer doorstep', distanceMeters: Math.round(directDist * 1000) }],
      };
    }
  }

  // Draw road-snapped route with high-contrast dual layer polyline (Zomato/Google Maps Blue)
  drawRoute(map: L.Map, pathCoordinates: [number, number][]): L.FeatureGroup {
    if (!pathCoordinates || pathCoordinates.length === 0) {
      return L.featureGroup().addTo(map);
    }

    // Outer casing line for contrast on light Google map tiles
    const shadowLine = L.polyline(pathCoordinates, {
      color: '#1d4ed8',
      weight: 8,
      opacity: 0.5,
      lineCap: 'round',
      lineJoin: 'round',
    });

    // Foreground Solid Navigation Blue Line (matching Zomato/Google Maps reference)
    const mainLine = L.polyline(pathCoordinates, {
      color: '#2563eb',
      weight: 5.5,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round',
    });

    const routeGroup = L.featureGroup([shadowLine, mainLine]).addTo(map);
    return routeGroup;
  }

  fitBounds(map: L.Map, points: MapCoordinates[]): void {
    if (points.length === 0) return;
    const latLngs = points.map((p) => [p.lat, p.lng] as [number, number]);
    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  }

  calculateDirectDistance(start: MapCoordinates, end: MapCoordinates): number {
    const R = 6371; // Earth radius in km
    const dLat = ((end.lat - start.lat) * Math.PI) / 180;
    const dLon = ((end.lng - start.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((start.lat * Math.PI) / 180) *
        Math.cos((end.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  calculateBearing(from: [number, number], to: [number, number]): number {
    const lat1 = (from[0] * Math.PI) / 180;
    const lat2 = (to[0] * Math.PI) / 180;
    const diffLong = ((to[1] - from[1]) * Math.PI) / 180;

    const x = Math.sin(diffLong) * Math.cos(lat2);
    const y =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(diffLong);

    let initialBearing = (Math.atan2(x, y) * 180) / Math.PI;
    return (initialBearing + 360) % 360;
  }

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'Scrapwala-Consumer-App/1.0',
        },
      });
      if (!res.ok) throw new Error('Geocoding service unavailable');
      const data = await res.json();

      const addr = data.address || {};
      const parts = [
        addr.road || addr.pedestrian || addr.street,
        addr.suburb || addr.neighbourhood || addr.residential,
        addr.city || addr.town || addr.county || 'Delhi NCR',
        addr.postcode,
      ].filter(Boolean);

      return parts.length > 0
        ? parts.join(', ')
        : data.display_name?.slice(0, 80) || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    } catch {
      return `Near Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    }
  }

  async searchPlaces(query: string): Promise<GeocodeResult[]> {
    if (!query.trim() || query.length < 3) return [];
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query
      )}&format=json&addressdetails=1&limit=5&countrycodes=in`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'Scrapwala-Consumer-App/1.0',
        },
      });
      if (!res.ok) return [];
      const items = await res.json();
      return items.map((it: any) => ({
        displayName: it.display_name,
        address: it.address || {},
        coords: [parseFloat(it.lon), parseFloat(it.lat)],
      }));
    } catch {
      return [];
    }
  }
}

// Singleton Map Provider
export const mapService = new LeafletMapProvider();
