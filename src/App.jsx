import { useRef, useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents, Polygon, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import * as turf from '@turf/turf';
import 'leaflet/dist/leaflet.css';
import 'leaflet-geosearch/dist/geosearch.css';
import { Layers, Compass, Loader2, Ruler, Trash2 } from 'lucide-react';
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

// Measurement Component
function MeasureLayer({ isMeasuring, points, setPoints }) {
  useMapEvents({
    click(e) {
      if (!isMeasuring) return;
      const { lat, lng } = e.latlng;
      setPoints(prev => [...prev, [lat, lng]]);
    },
    contextmenu() {
      // Optional: Right click to event
    }
  });

  // Render points and polygon
  if (points.length === 0) return null;

  const pathOptions = { color: '#10b981', weight: 2, fillColor: '#10b981', fillOpacity: 0.2 };

  // Calculate area if we have a polygon
  let areaText = null;
  let center = null;

  try {
    if (points.length >= 3) {
      // Close the polygon for Turf (first point = last point)
      // Turf expects [lng, lat]
      const closedPoints = [...points, points[0]].map(p => [p[1], p[0]]);
      const polygon = turf.polygon([closedPoints]);
      const area = turf.area(polygon);

      // Format area
      if (area > 1000000) {
        areaText = `${(area / 1000000).toFixed(2)} km²`;
      } else {
        areaText = `${Math.round(area).toLocaleString()} m²`;
      }

      const centerFeature = turf.center(polygon);
      center = [centerFeature.geometry.coordinates[1], centerFeature.geometry.coordinates[0]];
    } else if (points.length === 2) {
      const from = turf.point([points[0][1], points[0][0]]);
      const to = turf.point([points[1][1], points[1][0]]);
      const distance = turf.distance(from, to);
      areaText = `${distance.toFixed(2)} km`;
      center = points[1]; // Show near second point
    }
  } catch (err) {
    console.warn("Measurement calculation error", err);
  }

  return (
    <>
      {points.map((pos, idx) => (
        <Marker key={idx} position={pos} icon={DefaultIcon} opacity={0.8} />
      ))}
      {points.length > 1 && (
        <Polyline positions={points} pathOptions={pathOptions} />
      )}
      {points.length >= 3 && (
        <Polygon positions={points} pathOptions={pathOptions} />
      )}
      {areaText && center && (
        <Marker position={center} icon={L.divIcon({
          className: 'bg-transparent',
          html: `<div style="background-color: rgba(0,0,0,0.75); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; border: 1px solid rgba(16, 185, 129, 0.5); white-space: nowrap; transform: translate(-50%, -100%);">${areaText}</div>`
        })} />
      )}
    </>
  );
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

  // Measurement State
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState([]);


  // Use a ref to access the map instance safely
  const mapRef = useRef(null);

  const satelliteUrl = 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';
  const streetUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution = isSatellite
    ? '&copy; Google Maps'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  const handleLocateMe = () => {
    if (mapRef.current) {
      setLoading(true);
      mapRef.current.locate({ setView: true, maxZoom: 18, enableHighAccuracy: true });
    }
  };

  const clearMeasurements = () => {
    setMeasurePoints([]);
    setIsMeasuring(false);
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
          maxZoom={21}
        />
        <SearchField />
        <MapEvents setLat={setLat} setLng={setLng} setZoom={setZoom} />
        <LocationMarker setLoading={setLoading} />
        <MeasureLayer isMeasuring={isMeasuring} points={measurePoints} setPoints={setMeasurePoints} />
      </MapContainer>

      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-none">
          <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
            <p className="text-lg font-light tracking-widest text-blue-200">ACQUIRING SATELLITE SIGNAL...</p>
          </div>
        </div>
      )}

      {/* Measurement Instructions Overlay */}
      {isMeasuring && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-[1000] pointer-events-none">
          <div className="bg-emerald-900/90 backdrop-blur border border-emerald-500/50 px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-100 text-sm font-medium">Measurement Mode Active: Click points on map</span>
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

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                const newState = !isMeasuring;
                setIsMeasuring(newState);
                if (newState) setMeasurePoints([]); // Clear on start
              }}
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all duration-300 ${isMeasuring ? 'bg-amber-600/20 text-amber-400 border border-amber-500/50' : 'bg-white/5 hover:bg-white/10 border border-white/5'}`}
            >
              <Ruler className="w-4 h-4" />
              <span>{isMeasuring ? 'Stop' : 'Measure'}</span>
            </button>

            {measurePoints.length > 0 && (
              <button
                onClick={clearMeasurements}
                className="py-2 px-4 rounded-lg flex items-center justify-center transition-all duration-300 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/50"
                title="Clear Measurements"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
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
