import { NextResponse } from "next/server";import { getEnv } from "@/lib/env";import { runGeoGridSchedule } from "@/features/geogrid/scheduler";
async function run(request:Request){if(request.headers.get("authorization")!==`Bearer ${getEnv().GEOGRID_SCHEDULER_SECRET}`)return NextResponse.json({error:"Unauthorized"},{status:401});return NextResponse.json({data:await runGeoGridSchedule()});}
export async function POST(request:Request){return await run(request);}export async function GET(request:Request){return await run(request);}
