import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    console.log("🧪 Webhook test endpoint called");
    return NextResponse.json({ 
        success: true, 
        message: "Webhook endpoint is working",
        timestamp: new Date().toISOString()
    });
}

export async function POST(req: NextRequest) {
    console.log("🧪 Webhook test POST called");
    
    const body = await req.text();
    console.log("Test webhook body:", body);
    
    return NextResponse.json({ 
        success: true, 
        message: "Webhook POST is working",
        receivedBody: body,
        timestamp: new Date().toISOString()
    });
}