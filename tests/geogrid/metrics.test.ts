import { expect,it } from "vitest";
import { calculateScanMetrics,compareScans } from "@/features/geogrid/metrics";
const points=[{row:0,column:0,latitude:1,longitude:1,status:"COMPLETE" as const,rank:1},{row:0,column:1,latitude:1,longitude:2,status:"COMPLETE" as const,rank:10},{row:1,column:0,latitude:0,longitude:1,status:"COMPLETE" as const,rank:null},{row:1,column:1,latitude:0,longitude:2,status:"FAILED" as const,rank:null}];
it("reports partial completion without assigning ranks to missing points",()=>{expect(calculateScanMetrics(points)).toEqual({averageRank:5.5,foundCount:2,notFoundCount:1,successfulCount:3,totalCount:4,completionRate:75,top3Coverage:33.33,top10Coverage:66.67,visibility:51.67});});
it("compares point changes",()=>{expect(compareScans(points,[{...points[0],rank:3},...points.slice(1)])?.points[0].change).toBe("IMPROVED");expect(compareScans(points.slice(0,1),points)).toBeNull();});
