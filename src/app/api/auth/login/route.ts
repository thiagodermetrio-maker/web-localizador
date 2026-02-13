import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Usuario from '@/models/Usuario';

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
    // Log para debug
    console.log('🔐 Requisição de login recebida');
    console.log('📍 Origem:', request.headers.get('origin') || 'N/A');
    console.log('🌐 IP:', request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'N/A');
    
    await connectDB();

    const body = await request.json();
    const { usuario, senha } = body;
    
    console.log('👤 Tentativa de login para usuário:', usuario);

    // Validação básica
    if (!usuario || !senha) {
      return NextResponse.json(
        { success: false, error: 'Usuário e senha são obrigatórios' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Buscar usuário no banco de dados
    const usuarioEncontrado = await Usuario.findOne({ usuario, senha });

    if (!usuarioEncontrado) {
      console.log('❌ Credenciais inválidas para usuário:', usuario);
      return NextResponse.json(
        { success: false, error: 'Usuário ou senha inválidos' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Autenticação bem-sucedida
    console.log('✅ Login bem-sucedido para usuário:', usuarioEncontrado.usuario);
    return NextResponse.json(
      {
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          usuario: usuarioEncontrado.usuario,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Erro ao autenticar usuário:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500, headers: corsHeaders }
    );
  }
}
