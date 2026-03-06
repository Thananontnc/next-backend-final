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

export async function PATCH(req, { params }) {
    const user = verifyAuth(req);
    if (!user) return authError(NextResponse, "Unauthorized", 401);

    const { id } = await params;

    try {
        const body = await req.json();
        const { status } = body;

        const client = await getClientPromise();
        const db = client.db("library");

        const borrowRequest = await db.collection("borrow_requests").findOne({ _id: new ObjectId(id) });
        if (!borrowRequest) return NextResponse.json({ message: "Not found" }, { status: 404, headers: corsHeaders });

        // Validate permissions: User can only do CANCEL-USER on their own. Admin can do other statuses.
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

        const result = await db.collection("borrow_requests").updateOne(
            { _id: new ObjectId(id) },
            { $set: { status } }
        );

        return NextResponse.json({ message: "Updated successfully" }, { headers: corsHeaders });
    } catch (error) {
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500, headers: corsHeaders });
    }
}
