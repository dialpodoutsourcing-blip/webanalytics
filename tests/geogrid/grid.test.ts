import { describe, expect, it } from "vitest";
import { generateGrid, parseGridConfig } from "@/features/geogrid/grid";
describe("geo-grid generation",()=>{
  it("creates a north-to-south 7 by 7 grid with an exact center",()=>{const points=generateGrid({centerLat:28.5,centerLng:-81.3,size:7,radiusKm:2});expect(points).toHaveLength(49);expect(points.find(p=>p.row===3&&p.column===3)).toEqual({row:3,column:3,latitude:28.5,longitude:-81.3});expect(points[0].latitude).toBeGreaterThan(points[48].latitude);expect(points[0].longitude).toBeLessThan(points[6].longitude);expect(new Set(points.map(p=>`${p.row}:${p.column}`)).size).toBe(49);});
  it("validates odd sizes and bounded radii",()=>{expect(parseGridConfig({centerLat:0,centerLng:0,size:3,radiusKm:.1}).size).toBe(3);for(const value of [{centerLat:0,centerLng:0,size:4,radiusKm:1},{centerLat:0,centerLng:0,size:17,radiusKm:1},{centerLat:0,centerLng:0,size:3,radiusKm:51}])expect(()=>parseGridConfig(value)).toThrow();});
  it("keeps high-latitude and antimeridian coordinates finite and bounded",()=>{const points=generateGrid({centerLat:89.9,centerLng:179.99,size:3,radiusKm:50});expect(points.every(p=>Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&p.latitude>=-90&&p.latitude<=90&&p.longitude>=-180&&p.longitude<=180)).toBe(true);});
});
