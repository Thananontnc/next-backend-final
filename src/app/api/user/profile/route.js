// REFERENCE: This file is provided as a user registration example.
// Students must implement authentication and role-based logic as required in the exam.
import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { verifyAuth, authError } from "@/lib/auth";

export async function OPTIONS(req) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(req) {
  const user = verifyAuth(req);
  if (!user) return authError(NextResponse, "Unauthorized", 401);

  try {
    const client = await getClientPromise();
    const db = client.db("library");
    const email = user.email;
    const profile = await db.collection("users").findOne({ email }, { projection: { password: 0 } });
    return NextResponse.json(profile, {
      headers: corsHeaders
    })
  }
  catch (error) {
    return NextResponse.json(error.toString(), {
      headers: corsHeaders
    })
  }
}