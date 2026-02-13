import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Bairro from '@/models/Bairro';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const body = await request.json();
    const { id } = await params;

    // Se for para remover ruas
    if (body.operacao === 'remover' && body.ruas) {
      const bairro = await Bairro.findByIdAndUpdate(
        id,
        { $pull: { ruas: { $in: body.ruas } } },
        { new: true, runValidators: true }
      );

      if (!bairro) {
        return NextResponse.json(
          { success: false, error: 'Bairro não encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: true, data: bairro },
        { status: 200 }
      );
    }

    // Se for para adicionar ruas (comportamento padrão)
    const bairro = await Bairro.findByIdAndUpdate(
      id,
      { $push: { ruas: { $each: body.ruas } } },
      { new: true, runValidators: true }
    );

    if (!bairro) {
      return NextResponse.json(
        { success: false, error: 'Bairro não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: bairro },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Erro ao atualizar bairro:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const bairro = await Bairro.findById(id);

    if (!bairro) {
      return NextResponse.json(
        { success: false, error: 'Bairro não encontrado' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: bairro }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao buscar bairro:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
