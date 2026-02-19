import { useRef, useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet/dist/leaflet.css';
import 'leaflet-geosearch/dist/geosearch.css';
import { Layers, Compass, Loader2 } from 'lucide-react';
import React from 'react';

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

// Error Boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center w-screen h-screen bg-zinc-900 text-white p-4">
          <div className="max-w-md bg-red-900/20 border border-red-500/50 p-6 rounded-lg text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Application Error</h1>
            <p className="text-gray-300 font-mono text-sm break-words">{this.state.error?.toString()}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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

// Map Events
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

// Location Marker
function LocationMarker({ setLoading }) {
  const map = useMap();

  useEffect(() => {
    map.locate({ setView: true, maxZoom: 18, watch: true, enableHighAccuracy: true });

    const onLocationFound = (e) => {
      setLoading(false);
      map.eachLayer((layer) => {
        if (layer._popup && layer._popup.getContent() === "You are here") {
          map.removeLayer(layer);
        }
      });
      const radius = e.accuracy / 2;
      L.marker(e.latlng).addTo(map).bindPopup("You are here").openPopup();
      L.circle(e.latlng, radius).addTo(map);
    };

    map.on('locationfound', onLocationFound);
    map.on('locationerror', (e) => {
      console.warn("Location access denied or failed", e);
      setLoading(false);
    });

    return () => {
      map.stopLocate();
      map.off('locationfound', onLocationFound);
    };
  }, [map]);

  return null;
}

function AppContent() {
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [zoom, setZoom] = useState(2);
  const [isSatellite, setIsSatellite] = useState(true);
  const [loading, setLoading] = useState(true);

  // Use a ref to access the map instance safely
  const mapRef = useRef(null);

  const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const streetUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution = isSatellite
    ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  const handleLocateMe = () => {
    if (mapRef.current) {
      setLoading(true);
      mapRef.current.locate({ setView: true, maxZoom: 18, enableHighAccuracy: true });
    }
  };

  return (
    <div className="relative w-full h-full bg-black text-white overflow-hidden">
      <MapContainer
        center={[0, 0]}
        zoom={2}
        style={{ width: '100%', height: '100%', zIndex: 1 }}
        zoomControl={false}
        attributionControl={false}
        ref={mapRef}
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

      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-none">
          <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
            <p className="text-lg font-light tracking-widest text-blue-200">ACQUIRING SATELLITE SIGNAL...</p>
          </div>
        </div>
      )}

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
            onClick={handleLocateMe}
            className="w-full py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all duration-300 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/50 mt-2"
          >
            <Compass className="w-4 h-4" />
            <span>Locate Me</span>
          </button>
        </div>
      </div>

      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-[500]"></div>
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-[500]"></div>

    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
