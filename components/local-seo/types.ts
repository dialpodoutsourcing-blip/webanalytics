import type { LocationOption } from "./location-picker";
import type { KeywordView } from "./keyword-manager";
export type { LocationOption, KeywordView };
export type AnalyticsReport = { daily: { calls: Array<{date:string;value:number}>; directions: Array<{date:string;value:number}>; websiteClicks: Array<{date:string;value:number}>; impressions: Array<{date:string;value:number}> }; searchQueries: Array<{keyword:string;impressions:number|null;threshold?:string}>; fetchedAt: string };
