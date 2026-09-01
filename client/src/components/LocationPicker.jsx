import { useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL(
    "leaflet/dist/images/marker-icon-2x.png",
    import.meta.url,
  ).href,
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).href,
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url)
    .href,
});
const fallback = [
  Number(import.meta.env.VITE_DEFAULT_LAT || 11.7447),
  Number(import.meta.env.VITE_DEFAULT_LNG || 79.768),
];
function PickerMarker({ position, onChange }) {
  useMapEvents({
    click: ({ latlng }) =>
      onChange({ latitude: latlng.lat, longitude: latlng.lng }),
  });
  return position ? (
    <Marker position={[position.latitude, position.longitude]} />
  ) : null;
}
function Recenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView([position.latitude, position.longitude], 16);
  }, [map, position]);
  return null;
}
export function LocationPicker({ value, onChange }) {
  const [position, setPosition] = useState(
      value?.latitude && value?.longitude ? value : null,
    ),
    [locating, setLocating] = useState(false);
  const update = (next) => {
    setPosition(next);
    onChange(next);
  };
  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        update({ latitude: coords.latitude, longitude: coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  return (
    <div className='location-picker'>
      <div className='location-actions'>
        <span>Click the map to place the service-site pin.</span>
        <button type='button' onClick={locate} disabled={locating}>
          {locating ? "Locating…" : "Use my location"}
        </button>
      </div>
      <MapContainer
        center={position ? [position.latitude, position.longitude] : fallback}
        zoom={position ? 16 : 12}
        className='location-map'
      >
        <TileLayer
          attribution={
            import.meta.env.VITE_MAP_ATTRIBUTION ||
            "© OpenStreetMap contributors"
          }
          url={
            import.meta.env.VITE_MAP_TILE_URL ||
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
        />
        <PickerMarker position={position} onChange={update} />
        <Recenter position={position} />
      </MapContainer>
      {position && (
        <small>
          Coordinates: {position.latitude.toFixed(6)},{" "}
          {position.longitude.toFixed(6)}
        </small>
      )}
    </div>
  );
}
