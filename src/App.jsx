import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import * as turf from '@turf/turf';

// Mapbox CSS
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { Layers, Compass, Loader2 } from 'lucide-react';

// Access Token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbHZ6aHZ5ZW0wMDJ5MmpvM3Z5aG55Z2hlIn0.ABC'; // Fallback to example if missing

if (!import.meta.env.VITE_MAPBOX_TOKEN) {
  console.warn("Please add your Mapbox Access Token to .env file as VITE_MAPBOX_TOKEN");
}

mapboxgl.accessToken = MAPBOX_TOKEN;

export default function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const draw = useRef(null); // Reference for draw control
  const [lng, setLng] = useState(0);
  const [lat, setLat] = useState(0);
  const [zoom, setZoom] = useState(2);
  const [is3D, setIs3D] = useState(false);
  const [loading, setLoading] = useState(true);
  const [measurement, setMeasurement] = useState(null); // State for measurement result

  useEffect(() => {
    if (map.current) return; // initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [lng, lat],
      zoom: zoom,
      maxZoom: 22,
      projection: 'globe' // Display the map as a 3D globe
    });

    map.current.on('style.load', () => {
      // Add 3D terrain
      map.current.addSource('mapbox-dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
        'tileSize': 512,
        'maxzoom': 14
      });
      // Initial terrain state
      if (is3D) {
        map.current.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
      }

      // Add sky layer
      map.current.addLayer({
        'id': 'sky',
        'type': 'sky',
        'paint': {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 0.0],
          'sky-atmosphere-sun-intensity': 15
        }
      });
    });

    // Add Geocoder
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      marker: true,
    });
    map.current.addControl(geocoder, 'top-left');

    // Draw Control for Measurement
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        line_string: true,
        point: true,
        trash: true
      },
      defaultMode: 'simple_select'
    });
    map.current.addControl(draw.current, 'top-left');

    const updateMeasurement = (e) => {
      const data = draw.current.getAll();
      if (data.features.length > 0) {
        const feature = data.features[0]; // Take the first feature
        if (feature.geometry.type === 'Polygon') {
          const area = turf.area(feature);
          setMeasurement(`Area: ${Math.round(area).toLocaleString()} m²`);
        } else if (feature.geometry.type === 'LineString') {
          const distance = turf.length(feature);
          setMeasurement(`Distance: ${distance.toFixed(2)} km`);
        } else if (feature.geometry.type === 'Point') {
          const coords = feature.geometry.coordinates;
          setMeasurement(`Location: ${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}`);
        }
      } else {
        setMeasurement(null);
      }
    };

    map.current.on('draw.create', updateMeasurement);
    map.current.on('draw.update', updateMeasurement);
    map.current.on('draw.delete', updateMeasurement);

    // Controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    map.current.addControl(new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true
    }), 'top-right');


    map.current.on('move', () => {
      setLng(map.current.getCenter().lng.toFixed(4));
      setLat(map.current.getCenter().lat.toFixed(4));
      setZoom(map.current.getZoom().toFixed(2));
    });

    map.current.on('load', () => {
      setLoading(false);
      // Try to get user location immediately
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(position => {
          map.current.flyTo({
            center: [position.coords.longitude, position.coords.latitude],
            zoom: 14,
            essential: true
          });
        });
      }
    });

  }, []);

  // Toggle 3D Terrain
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    if (is3D) {
      map.current.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
      map.current.easeTo({ pitch: 60, duration: 1000 });
    } else {
      map.current.setTerrain(null);
      map.current.easeTo({ pitch: 0, duration: 1000 });
    }
  }, [is3D]);

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden">

      {/* Map Container */}
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0 z-0 w-full h-full" style={{ width: '100vw', height: '100vh' }} />

      {/* Measurement Display */}
      {measurement && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 bg-black/80 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 shadow-xl">
          <span className="text-emerald-400 font-mono font-bold tracking-wider">{measurement}</span>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
            <p className="text-lg font-light tracking-widest text-blue-200">INITIALIZING SATELLITE UPLINK...</p>
          </div>
        </div>
      )}

      {/* Interface Overlay */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        {/* Search bar is injected here by Mapbox */}
      </div>

      {/* Control Panel */}
      <div className="absolute bottom-8 left-8 z-10 p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-80">
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
            <span>MODE: {is3D ? '3D' : '2D'}</span>
          </div>

          <div className="h-px bg-white/10 my-2"></div>

          <button
            onClick={() => setIs3D(!is3D)}
            className={`w-full py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all duration-300 ${is3D ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50' : 'bg-white/5 hover:bg-white/10 border border-white/5'}`}
          >
            <Layers className="w-4 h-4" />
            <span>{is3D ? 'Disable 3D Terrain' : 'Enable 3D Terrain'}</span>
          </button>
          <button
            onClick={() => {
              map.current.resetNorth();
              map.current.userRotate = !map.current.userRotate;
            }}
            className="w-full py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all duration-300 bg-white/5 hover:bg-white/10 border border-white/5"
          >
            <Compass className="w-4 h-4" />
            <span>Reset North</span>
          </button>
          <button
            onClick={() => {
              draw.current.deleteAll();
              setMeasurement(null);
            }}
            className="w-full py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all duration-300 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 mt-2"
          >
            <span>Clear Markers</span>
          </button>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>

    </div>
  );
}
