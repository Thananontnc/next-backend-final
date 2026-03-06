import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { verifyAuth, authError } from "@/lib/auth";
import { ObjectId } from "mongodb";

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

    const query = user.role === "ADMIN" ? {} : { userId: user.id };
    const requests = await db.collection("borrow_requests").find(query).toArray();

    return NextResponse.json(requests, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req) {
  const user = verifyAuth(req);
  if (!user) return authError(NextResponse, "Unauthorized", 401);

  try {
    const body = await req.json();
    const { targetDate, bookId } = body;

    if (!targetDate) {
      return NextResponse.json({ message: "Missing target date" }, { status: 400, headers: corsHeaders });
    }

    const newRequest = {
      userId: user.id,
      bookId: bookId,
      createdAt: new Date().toISOString(),
      targetDate: targetDate,
      status: "INIT"
    };

    const client = await getClientPromise();
    const db = client.db("library");
    const result = await db.collection("borrow_requests").insertOne(newRequest);

    return NextResponse.json({ message: "Request created", id: result.insertedId }, { status: 201, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500, headers: corsHeaders });
  }
}

export async function PATCH(req) {
  const user = verifyAuth(req);
  if (!user) return authError(NextResponse, "Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ message: "Missing ID" }, { status: 400, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { status } = body;

    const client = await getClientPromise();
    const db = client.db("library");

    const borrowRequest = await db.collection("borrow_requests").findOne({ _id: new ObjectId(id) });
    if (!borrowRequest) return NextResponse.json({ message: "Not found" }, { status: 404, headers: corsHeaders });

    if (user.role === "USER") {
      if (borrowRequest.userId !== user.id || status !== "CANCEL-USER") {
        return authError(NextResponse, "Forbidden", 403);
      }
    } else if (user.role === "ADMIN") {
      const allowedAdminStatuses = ["ACCEPTED", "CLOSE-NO-AVAILABLE-BOOK", "CANCEL-ADMIN", "INIT"];
      if (!allowedAdminStatuses.includes(status)) {
        return NextResponse.json({ message: "Invalid status" }, { status: 400, headers: corsHeaders });
      }
    }

    await db.collection("borrow_requests").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status } }
    );

    return NextResponse.json({ message: "Updated successfully" }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500, headers: corsHeaders });
  }
}