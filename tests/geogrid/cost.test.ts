import { expect,it } from "vitest";
import { checkSpendPolicy,estimateScanCost } from "@/features/geogrid/cost";
it("estimates with integer micro-dollars",()=>{expect(estimateScanCost({pointCount:49,pricePerTaskMicroUsd:600})).toBe(.0294);});
it("allows equality and rejects costs beyond scan, week, or month caps",()=>{const base={estimatedMicroUsd:1000,spentWeekMicroUsd:9000,spentMonthMicroUsd:29000,maxScanMicroUsd:1000,weeklyLimitMicroUsd:10000,monthlyLimitMicroUsd:30000};expect(checkSpendPolicy(base)).toEqual({allowed:true});expect(checkSpendPolicy({...base,spentWeekMicroUsd:9001})).toMatchObject({allowed:false,reason:"WEEKLY_LIMIT"});});
