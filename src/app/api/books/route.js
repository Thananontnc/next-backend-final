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

  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title");
  const author = searchParams.get("author");

  const query = {};
  if (user.role !== "ADMIN") {
    query.status = { $ne: "DELETED" };
  }

  if (title) {
    query.title = { $regex: title, $options: "i" };
  }
  if (author) {
    query.author = { $regex: author, $options: "i" };
  }

  try {
    const client = await getClientPromise();
    const db = client.db("library");
    const books = await db.collection("books").find(query).toArray();
    return NextResponse.json(books, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req) {
  const user = verifyAuth(req);
  if (!user) return authError(NextResponse, "Unauthorized", 401);
  if (user.role !== "ADMIN") return authError(NextResponse, "Forbidden", 403);

  try {
    const body = await req.json();
    const { title, author, quantity, location } = body;

    if (!title || !author) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    const newBook = {
      title,
      author,
      quantity: quantity || 1,
      location: location || "",
      status: "ACTIVE"
    };

    const client = await getClientPromise();
    const db = client.db("library");
    const result = await db.collection("books").insertOne(newBook);

    if (result.acknowledged) {
      return NextResponse.json({ message: "Book created successfully", id: result.insertedId }, { status: 201, headers: corsHeaders });
    }
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500, headers: corsHeaders });
  }
}
