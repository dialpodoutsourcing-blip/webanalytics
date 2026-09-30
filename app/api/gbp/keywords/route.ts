import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { unauthorizedResponse } from "@/lib/route-auth";
import { createKeyword, createKeywordInput, listLocationKeywords, updateKeyword, updateKeywordInput } from "@/features/gbp/keywords";

function failed(error: unknown) { return NextResponse.json({ error: error instanceof ZodError ? "Check the keyword and try again." : "The keyword could not be saved." }, { status: error instanceof ZodError ? 400 : 503 }); }
export async function GET(request: Request) { const denied = await unauthorizedResponse(); if (denied) return denied; try { return NextResponse.json({ data: await listLocationKeywords(new URL(request.url).searchParams.get("locationId") ?? "") }); } catch (error) { return failed(error); } }
export async function POST(request: Request) { const denied = await unauthorizedResponse(); if (denied) return denied; try { return NextResponse.json({ data: await createKeyword(createKeywordInput.parse(await request.json())) }, { status: 201 }); } catch (error) { return failed(error); } }
export async function PATCH(request: Request) { const denied = await unauthorizedResponse(); if (denied) return denied; try { return NextResponse.json({ data: await updateKeyword(updateKeywordInput.parse(await request.json())) }); } catch (error) { return failed(error); } }
