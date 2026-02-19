import { useRef, useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';

import 'leaflet/dist/leaflet.css';
import 'leaflet-geosearch/dist/geosearch.css';
import { Layers, Loader2 } from 'lucide-react';

// Fix Leaflet's default icon path issues
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Search Component
function SearchField() {
  const map = useMap();

  useEffect(() => {
    const provider = new OpenStreetMapProvider();

    const searchControl = new GeoSearchControl({
      provider: provider,
      style: 'bar', // 'button' or 'bar'
      showMarker: true,
      showPopup: false,
      autoClose: true,
      retainZoomLevel: false,
      animateZoom: true,
      keepResult: true,
      searchLabel: 'Enter address',
    });

    map.addControl(searchControl);
    return () => map.removeControl(searchControl);
  }, [map]);

  return null;
}

// Component to handle map movement events
function MapEvents({ setLat, setLng, setZoom }) {
  const map = useMapEvents({
    move: () => {
      const center = map.getCenter();
      setLat(center.lat.toFixed(4));
      setLng(center.lng.toFixed(4));
      setZoom(map.getZoom());
    },
  });
  return null;
}

// Component to fly to user location on load
// Component to fly to user location on load
function LocationMarker({ setLoading }) {
  const map = useMap();

  useEffect(() => {
    // Initial locate
    map.locate({ setView: true, maxZoom: 18, watch: true, enableHighAccuracy: true });

    const onLocationFound = (e) => {
      setLoading(false);
      // We don't want to re-center constantly if user is panning, 
      // but initial load should center.
      // Leaflet's 'setView: true' handles the initial centering.
      // We can add a marker.

      // Remove existing location markers to avoid duplicates if tracking updates
      map.eachLayer((layer) => {
        if (layer._popup && layer._popup.getContent() === "You are here") {
          map.removeLayer(layer);
        }
      });

      // Add circle and marker
      const radius = e.accuracy / 2;
      L.marker(e.latlng).addTo(map).bindPopup("You are here").openPopup();
      L.circle(e.latlng, radius).addTo(map);
    };

    map.on('locationfound', onLocationFound);

    map.on('locationerror', (e) => {
      console.warn("Location access denied or failed", e);
      setLoading(false); // Stop loading even if failed
    });

    return () => {
      map.stopLocate();
      map.off('locationfound', onLocationFound);
    };
  }, [map]);

  return null;
}

export default function App() {
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [zoom, setZoom] = useState(2);
  const [isSatellite, setIsSatellite] = useState(true);
  const [loading, setLoading] = useState(true);

  // Tile Layers
  const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const streetUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution = isSatellite
    ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden">

      {/* Map Container */}
      <MapContainer
        center={[0, 0]}
        zoom={2}
        style={{ width: '100vw', height: '100vh', zIndex: 1 }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url={isSatellite ? satelliteUrl : streetUrl}
          attribution={attribution}
          maxZoom={19}
        />
        <SearchField />
        <MapEvents setLat={setLat} setLng={setLng} setZoom={setZoom} />
        <LocationMarker setLoading={setLoading} />
      </MapContainer>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-none">
          <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
            <p className="text-lg font-light tracking-widest text-blue-200">ACQUIRING SATELLITE SIGNAL...</p>
          </div>
        </div>
      )}

      {/* Control Panel */}
      <div className="absolute bottom-8 left-8 z-[1000] p-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-80">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            ORBIT VIEW
          </h1>
          <div className="flex space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs text-emerald-500 font-mono">LIVE</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-400 font-mono">
            <span>LAT: {lat}</span>
            <span>LNG: {lng}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-400 font-mono">
            <span>ZOOM: {zoom}</span>
            <span>TYPE: {isSatellite ? 'SAT' : 'MAP'}</span>
          </div>

          <div className="h-px bg-white/10 my-2"></div>

          <button
            onClick={() => setIsSatellite(!isSatellite)}
            className={`w-full py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all duration-300 ${isSatellite ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50' : 'bg-white/5 hover:bg-white/10 border border-white/5'}`}
          >
            <Layers className="w-4 h-4" />
            <span>{isSatellite ? 'Switch to Street Map' : 'Switch to Satellite'}</span>
          </button>
          <button
            onClick={() => {
              const map = document.querySelector('.leaflet-container')._leaflet_map;
              setLoading(true);
              map.locate({ setView: true, maxZoom: 18, enableHighAccuracy: true });
            }}
            className="w-full py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all duration-300 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/50 mt-2"
          >
            <Compass className="w-4 h-4" />
            <span>Locate Me</span>
          </button>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-[500]"></div>
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-[500]"></div>

    </div>
  );
}
