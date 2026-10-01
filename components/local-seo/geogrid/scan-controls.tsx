import type { LocationOption } from "../location-picker";

type Keyword = { id: string; displayKeyword: string; state: string; defaultGridSize: number; radiusKm: number };
export function ScanControls({ locations, locationId, onLocation, keywords, keywordId, onKeyword, gridSize, onGridSize, radiusKm, onRadius, onRun, running }: {
  locations: LocationOption[]; locationId: string; onLocation: (value: string) => void; keywords: Keyword[]; keywordId: string; onKeyword: (value: string) => void;
  gridSize: number; onGridSize: (value: number) => void; radiusKm: number; onRadius: (value: number) => void; onRun: () => void; running: boolean;
}) {
  const points = gridSize * gridSize, cost = points * .0006;
  const selectedLocation = locations.find((location) => location.googleLocationId === locationId);
  return <div className="scan-controls">
    <div className="scan-fields">
      <label>Business Profile location<select aria-label="Business Profile location" value={locationId} onChange={(event) => onLocation(event.target.value)}><option value="">Choose a location</option>{locations.map((location) => <option key={location.googleLocationId} value={location.googleLocationId}>{location.title}</option>)}</select></label>
      <label>Tracked keyword<select aria-label="Tracked keyword" value={keywordId} onChange={(event) => onKeyword(event.target.value)} disabled={!locationId}><option value="">Choose a keyword</option>{keywords.filter((item) => item.state === "APPROVED").map((item) => <option key={item.id} value={item.id}>{item.displayKeyword}</option>)}</select></label>
      <label className="compact-field">Grid size<select aria-label="Grid size" value={gridSize} onChange={(event) => onGridSize(Number(event.target.value))}>{[3,5,7,9,11,13,15].map((size) => <option key={size} value={size}>{size} by {size}</option>)}</select></label>
      <label className="compact-field">Radius (km)<input aria-label="Radius in kilometers" type="number" min="0.1" max="50" step="0.1" value={radiusKm} onChange={(event) => onRadius(Number(event.target.value))}/></label>
    </div>
    {selectedLocation && (selectedLocation.latitude == null || selectedLocation.longitude == null) && <p className="notice">This location has no coordinates. Synchronize GBP after adding a map pin.</p>}
    <div className="scan-actions"><div className="scan-estimate"><b>{points} points</b><span>Estimated cost ${cost.toFixed(4)}</span></div><button disabled={!keywordId || running || !selectedLocation || selectedLocation.latitude == null || selectedLocation.longitude == null} onClick={onRun}>{running ? "Scan running..." : "Run new scan"}</button></div>
  </div>;
}
