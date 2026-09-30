import { NextResponse } from "next/server";import { getGeoGridEnv } from "@/lib/env";import { runGeoGridSchedule } from "@/features/geogrid/scheduler";
async function run(request:Request){if(request.headers.get("authorization")!==`Bearer ${getGeoGridEnv().CRON_SECRET}`)return NextResponse.json({error:"Unauthorized"},{status:401});return NextResponse.json({data:await runGeoGridSchedule()});}
export async function POST(request:Request){return await run(request);}export async function GET(request:Request){return await run(request);}
