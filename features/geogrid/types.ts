export type GridConfig={centerLat:number;centerLng:number;size:number;radiusKm:number};
export type GridPoint={row:number;column:number;latitude:number;longitude:number};
export type PointObservation=GridPoint&{status:"COMPLETE"|"FAILED";rank:number|null;placeId?:string;matchConfidence?:"EXACT"|"FALLBACK";competitors?:CompetitorObservation[]};
export type CompetitorObservation={placeId:string|null;name:string;rank:number;address:string|null};
