/**
 * EXEMPLO DE USO DO LOADING SCREEN
 * 
 * Este arquivo contém exemplos práticos de como usar o componente LoadingScreen
 * em diferentes cenários. Você pode copiar e adaptar conforme necessário.
 */

'use client';

import { useState, useEffect } from 'react';
import LoadingScreen from './LoadingScreen';

// ============================================
// EXEMPLO 1: Uso Básico
// ============================================
export function Example1_Basic() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simula carregamento de dados
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  }, []);

  if (loading) {
    return <LoadingScreen title="Carregando" subtitle="Aguarde..." />;
  }

  return <div>Conteúdo carregado!</div>;
}

// ============================================
// EXEMPLO 2: Com Logo Customizado (SVG Simples)
// ============================================
function SimpleLogo() {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className="w-full h-full text-blue-500"
      fill="none"
    >
      <circle 
        cx="50" 
        cy="50" 
        r="40" 
        stroke="currentColor" 
        strokeWidth="3"
        className="animate-pulse"
      />
      <circle 
        cx="50" 
        cy="50" 
        r="25" 
        fill="currentColor"
        opacity="0.3"
      />
    </svg>
  );
}

export function Example2_WithCustomLogo() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  }, []);

  if (loading) {
    return (
      <LoadingScreen 
        title="Meu App"
        subtitle="Carregando..."
        logo={<SimpleLogo />}
      />
    );
  }

  return <div>Conteúdo carregado!</div>;
}

// ============================================
// EXEMPLO 3: Com Logo Animado (Gradiente)
// ============================================
function AnimatedGradientLogo() {
  return (
    <svg 
      viewBox="0 0 200 200" 
      className="w-full h-full"
      fill="none"
    >
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6">
            <animate
              attributeName="stop-color"
              values="#3b82f6;#8b5cf6;#ec4899;#f59e0b;#3b82f6"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="50%" stopColor="#8b5cf6">
            <animate
              attributeName="stop-color"
              values="#8b5cf6;#ec4899;#f59e0b;#3b82f6;#8b5cf6"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="#ec4899">
            <animate
              attributeName="stop-color"
              values="#ec4899;#f59e0b;#3b82f6;#8b5cf6;#ec4899"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>
      </defs>
      <circle 
        cx="100" 
        cy="100" 
        r="80" 
        stroke="url(#gradient)" 
        strokeWidth="8"
        fill="none"
        className="animate-pulse"
      />
      <path 
        d="M 100 20 L 120 80 L 180 80 L 135 120 L 155 180 L 100 140 L 45 180 L 65 120 L 20 80 L 80 80 Z"
        fill="url(#gradient)"
        opacity="0.5"
      />
    </svg>
  );
}

export function Example3_WithAnimatedLogo() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 3000);
  }, []);

  if (loading) {
    return (
      <LoadingScreen 
        title="Aplicativo"
        subtitle="Inicializando..."
        logo={<AnimatedGradientLogo />}
        logoSize="w-32 h-32 md:w-40 md:h-40"
      />
    );
  }

  return <div>Conteúdo carregado!</div>;
}

// ============================================
// EXEMPLO 4: Com Fundo Customizado
// ============================================
export function Example4_CustomBackground() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  }, []);

  if (loading) {
    return (
      <LoadingScreen 
        title="Sistema"
        subtitle="Carregando dados..."
        backgroundColor="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900"
      />
    );
  }

  return <div>Conteúdo carregado!</div>;
}

// ============================================
// EXEMPLO 5: Integração com Next.js (App Router)
// ============================================
export function Example5_NextJSAppRouter() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    // Simula fetch de dados
    fetch('/api/data')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <LoadingScreen title="Carregando" subtitle="Buscando dados..." />;
  }

  if (!data) {
    return <div>Erro ao carregar dados</div>;
  }

  return <div>Dados: {JSON.stringify(data)}</div>;
}

// ============================================
// EXEMPLO 6: Integração com React Router
// ============================================
export function Example6_ReactRouter() {
  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState<{ message: string } | null>(null);

  useEffect(() => {
    // Simula carregamento de dados da página
    const timer = setTimeout(() => {
      setPageData({ message: 'Página carregada!' });
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <LoadingScreen 
        title="Página"
        subtitle="Carregando conteúdo..."
      />
    );
  }

  return <div>{pageData?.message}</div>;
}

// ============================================
// EXEMPLO 7: Loading com Timeout
// ============================================
export function Example7_WithTimeout() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setError('Timeout: Carregamento demorou muito');
      setLoading(false);
    }, 5000); // Timeout de 5 segundos

    // Simula carregamento
    const loadData = async () => {
      try {
        // Simula uma requisição
        await new Promise(resolve => setTimeout(resolve, 2000));
        setLoading(false);
        clearTimeout(timeout);
      } catch (err) {
        setError('Erro ao carregar');
        setLoading(false);
        clearTimeout(timeout);
      }
    };

    loadData();

    return () => clearTimeout(timeout);
  }, []);

  if (loading) {
    return <LoadingScreen title="Carregando" subtitle="Aguarde..." />;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return <div>Conteúdo carregado com sucesso!</div>;
}

// ============================================
// EXEMPLO 8: Loading Condicional
// ============================================
export function Example8_ConditionalLoading() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simula verificação de autenticação
    setTimeout(() => {
      setIsAuthenticated(true);
      setIsLoading(false);
    }, 2000);
  }, []);

  if (isLoading) {
    return (
      <LoadingScreen 
        title="Verificando"
        subtitle="Autenticando usuário..."
      />
    );
  }

  if (!isAuthenticated) {
    return <div>Usuário não autenticado</div>;
  }

  return <div>Bem-vindo! Você está autenticado.</div>;
}

// ============================================
// EXEMPLO 9: Loading com Progresso (Fake)
// ============================================
export function Example9_WithProgress() {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setLoading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 items-center justify-center relative overflow-hidden">
        {/* Usa o LoadingScreen como base */}
        <LoadingScreen 
          title="Carregando"
          subtitle={`${progress}%`}
        />
      </div>
    );
  }

  return <div>Carregamento completo!</div>;
}

// ============================================
// EXEMPLO 10: Loading Full Screen Overlay
// ============================================
export function Example10_FullScreenOverlay() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  }, []);

  return (
    <div className="relative">
      {/* Conteúdo da página */}
      <div className="p-8">
        <h1>Minha Página</h1>
        <p>Conteúdo da página aqui...</p>
      </div>

      {/* Overlay de loading */}
      {loading && (
        <div className="fixed inset-0 z-50">
          <LoadingScreen 
            title="Processando"
            subtitle="Aguarde..."
            backgroundColor="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm"
          />
        </div>
      )}
    </div>
  );
}
