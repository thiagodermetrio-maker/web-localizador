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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB();

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    const rocada = await Rocada.findById(id);

    if (!rocada) {
      return NextResponse.json(
        { success: false, error: 'Rocada não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: rocada },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Erro ao buscar roçada:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB();

    const body = await request.json();
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    const rocada = await Rocada.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    );

    if (!rocada) {
      return NextResponse.json(
        { success: false, error: 'Rocada não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: rocada },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Erro ao atualizar roçada:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB();

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    const rocada = await Rocada.findByIdAndDelete(id);

    if (!rocada) {
      return NextResponse.json(
        { success: false, error: 'Rocada não encontrada' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Rocada removida com sucesso' },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Erro ao remover roçada:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
