import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LocalizadorUsuario from '@/models/LocalizadorUsuario';

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

// GET - Buscar todos os localizadores de usuário
export async function GET() {
  try {
    await connectDB();

    const localizadores = await LocalizadorUsuario.find({});

    return NextResponse.json(
      { success: true, data: localizadores },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Erro ao buscar localizadores:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { usuarioNome, coordenadasUsuario, tempoCoordenadas } = body;

    // Validação
    if (!usuarioNome || !coordenadasUsuario || !tempoCoordenadas) {
      return NextResponse.json(
        { success: false, error: 'Todos os campos são obrigatórios' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validar estrutura das coordenadas
    if (!coordenadasUsuario.lat || !coordenadasUsuario.lng) {
      return NextResponse.json(
        { success: false, error: 'Coordenadas inválidas. Deve conter lat e lng' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Buscar ou criar o documento do usuário
    let localizadorUsuario = await LocalizadorUsuario.findOne({ nomeUsuario: usuarioNome });

    if (!localizadorUsuario) {
      // Criar novo documento
      localizadorUsuario = new LocalizadorUsuario({
        nomeUsuario: usuarioNome,
        listaCoordenadas: [],
      });
    }

    // Criar nova coordenada
    const novaCoordenada = {
      dataHorario: tempoCoordenadas,
      coordenada: {
        lat: coordenadasUsuario.lat,
        lng: coordenadasUsuario.lng,
      },
    };

    // Adicionar nova coordenada no início do array
    localizadorUsuario.listaCoordenadas.unshift(novaCoordenada);

    // Manter apenas as 10 mais recentes (remover as mais antigas)
    if (localizadorUsuario.listaCoordenadas.length > 10) {
      localizadorUsuario.listaCoordenadas = localizadorUsuario.listaCoordenadas.slice(0, 10);
    }

    // Salvar no banco
    await localizadorUsuario.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Coordenada salva com sucesso',
        data: {
          totalCoordenadas: localizadorUsuario.listaCoordenadas.length,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Erro ao salvar coordenada:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500, headers: corsHeaders }
    );
  }
}
