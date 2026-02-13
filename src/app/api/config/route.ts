import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Config from '@/models/Config';

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

export async function GET() {
  try {
    await connectDB();

    let config = await Config.findOne({}).lean();

    // Se não existe, criar com valores padrão
    if (!config) {
      const defaultConfig = new Config({
        tempoRocagemPad: 60,
        tempoRelPad: 30,
      });
      await defaultConfig.save();
      config = defaultConfig.toObject();
    }

    return NextResponse.json(
      { success: true, data: config },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Erro ao buscar configuração:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // Buscar ou criar a configuração
    let config = await Config.findOne({});

    if (!config) {
      config = new Config({
        tempoRocagemPad: body.tempoRocagemPad || 60,
        tempoRelPad: body.tempoRelPad || 30,
      });
    } else {
      config.tempoRocagemPad = body.tempoRocagemPad ?? config.tempoRocagemPad;
      config.tempoRelPad = body.tempoRelPad ?? config.tempoRelPad;
    }

    await config.save();

    return NextResponse.json(
      { success: true, data: config },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Erro ao atualizar configuração:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
