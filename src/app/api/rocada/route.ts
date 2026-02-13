import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Rocada from '@/models/Rocada';

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handler para preflight (OPTIONS)
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const rocada = new Rocada(body);
    await rocada.save();

    return NextResponse.json(
      { success: true, data: rocada },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erro ao salvar roçada:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();

    const rocadas = await Rocada.find({}).lean();

    return NextResponse.json(
      { success: true, data: rocadas },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Erro ao buscar roçadas:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
