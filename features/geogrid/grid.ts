import { z } from "zod";
import type { GridConfig,GridPoint } from "./types";

const schema=z.object({centerLat:z.number().finite().min(-90).max(90),centerLng:z.number().finite().min(-180).max(180),size:z.number().int().min(3).max(15).refine(v=>v%2===1,"Grid size must be odd"),radiusKm:z.number().finite().min(.1).max(50)});
export function parseGridConfig(input:unknown):GridConfig{return schema.parse(input);}
const round=(value:number)=>Math.round(value*1e7)/1e7;
const wrap=(value:number)=>((value+180)%360+360)%360-180;
export function generateGrid(config:GridConfig):GridPoint[]{const value=parseGridConfig(config),middle=(value.size-1)/2,step=value.radiusKm/middle,latKm=111.32,cos=Math.max(Math.abs(Math.cos(value.centerLat*Math.PI/180)),.01),points:GridPoint[]=[];for(let row=0;row<value.size;row++)for(let column=0;column<value.size;column++){const north=(middle-row)*step,east=(column-middle)*step;points.push({row,column,latitude:north===0?value.centerLat:round(Math.max(-90,Math.min(90,value.centerLat+north/latKm))),longitude:east===0?value.centerLng:round(wrap(value.centerLng+east/(latKm*cos))) });}return points;}
