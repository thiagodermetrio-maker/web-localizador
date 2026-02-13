import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Bairro from '@/models/Bairro';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { nome, ruas } = body;

    if (!nome || !Array.isArray(ruas)) {
      return NextResponse.json(
        { success: false, error: 'Nome e ruas são obrigatórios' },
        { status: 400 }
      );
    }

    const bairro = await Bairro.create({
      nome,
      ruas,
    });

    return NextResponse.json(
      { success: true, data: bairro },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erro ao salvar bairro:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();

    const bairros = await Bairro.find({});

    return NextResponse.json(
      { success: true, data: bairros },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Erro ao buscar bairros:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
