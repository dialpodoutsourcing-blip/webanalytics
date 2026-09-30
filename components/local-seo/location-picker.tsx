"use client";

export type LocationOption = { googleLocationId: string; title: string; address: string | null; status: "OPEN" | "CLOSED" | "UNKNOWN"; latitude: number | null; longitude: number | null };

export function LocationPicker({ value, onChange, locations }: { value: string; onChange: (value: string) => void; locations: LocationOption[] }) {
  if (!locations.length) return <p className="notice">No Business Profile locations are connected. Sync locations after reconnecting Google in Settings.</p>;
  return <label>Business Profile location
    <select aria-label="Business Profile location" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="" disabled>Choose a location</option>
      {locations.map((location) => {
        const notes = [location.status === "CLOSED" ? "Closed" : null, location.latitude === null || location.longitude === null ? "no map coordinates" : null].filter(Boolean).join(", ");
        return <option key={location.googleLocationId} value={location.googleLocationId}>{location.title}{notes ? ` — ${notes}` : ""}</option>;
      })}
    </select>
  </label>;
}
