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

export async function GET(req, { params }) {
  const user = verifyAuth(req);
  if (!user) return authError(NextResponse, "Unauthorized", 401);

  const { id } = await params;

  try {
    const client = await getClientPromise();
    const db = client.db("library");

    let query = { _id: new ObjectId(id) };
    if (user.role !== "ADMIN") {
      query.status = { $ne: "DELETED" };
    }

    const book = await db.collection("books").findOne(query);
    if (!book) return NextResponse.json({ message: "Not found" }, { status: 404, headers: corsHeaders });

    return NextResponse.json(book, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500, headers: corsHeaders });
  }
}

export async function PATCH(req, { params }) {
  const user = verifyAuth(req);
  if (!user) return authError(NextResponse, "Unauthorized", 401);
  if (user.role !== "ADMIN") return authError(NextResponse, "Forbidden", 403);

  const { id } = await params;

  try {
    const body = await req.json();
    const client = await getClientPromise();
    const db = client.db("library");

    const updateFields = {};
    if (body.title !== undefined) updateFields.title = body.title;
    if (body.author !== undefined) updateFields.author = body.author;
    if (body.quantity !== undefined) updateFields.quantity = body.quantity;
    if (body.location !== undefined) updateFields.location = body.location;
    if (body.status !== undefined) updateFields.status = body.status;

    const result = await db.collection("books").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Book not found" }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json({ message: "Updated successfully" }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(req, { params }) {
  const user = verifyAuth(req);
  if (!user) return authError(NextResponse, "Unauthorized", 401);
  if (user.role !== "ADMIN") return authError(NextResponse, "Forbidden", 403);

  const { id } = await params;

  try {
    const client = await getClientPromise();
    const db = client.db("library");

    const result = await db.collection("books").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "DELETED" } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Book not found" }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json({ message: "Deleted successfully" }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500, headers: corsHeaders });
  }
}
