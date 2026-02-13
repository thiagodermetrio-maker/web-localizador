# LoadingScreen Component

Uma tela de loading elegante e moderna com animações circulares concêntricas, extraída do projeto AdvoSoft.

## 🎨 Características

- ✨ Três círculos animados girando em velocidades diferentes
- 🎨 Logo animada com efeito de **desenho progressivo** e **gradiente animado**
- 🎯 Logo customizável no centro (ou use a padrão com animação)
- 📱 Totalmente responsivo
- 🌙 Suporte a modo escuro (dark mode)
- 🎨 Altamente customizável
- ⚡ Zero dependências além do React e Tailwind CSS
- 🖊️ Efeito de desenho SVG com animação suave

## 📦 Requisitos

- React 18+
- Tailwind CSS configurado no projeto

## 🚀 Instalação

1. Copie o arquivo `LoadingScreen.tsx` para o seu projeto
2. Certifique-se de que o Tailwind CSS está configurado
3. Importe e use o componente

## 💻 Uso Básico

```tsx
import LoadingScreen from './LoadingScreen';

function App() {
  return (
    <LoadingScreen 
      title="Meu App"
      subtitle="Carregando..."
    />
  );
}
```

**Nota:** Por padrão, o componente usa uma logo animada com efeito de desenho e gradiente. A logo é desenhada progressivamente com um gradiente que muda de cor (azul → roxo → rosa → laranja) continuamente.

## 🎨 Exemplos de Uso

### Exemplo 1: Uso Simples

```tsx
import LoadingScreen from './LoadingScreen';

function MyPage() {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <LoadingScreen title="Carregando" subtitle="Aguarde..." />;
  }

  return <div>Conteúdo carregado</div>;
}
```

### Exemplo 2: Com Logo Customizado

```tsx
import LoadingScreen from './LoadingScreen';

function CustomLogo() {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className="w-full h-full text-blue-500"
    >
      <circle 
        cx="50" 
        cy="50" 
        r="40" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3"
        className="animate-pulse"
      />
    </svg>
  );
}

function App() {
  return (
    <LoadingScreen 
      title="Meu App"
      subtitle="Carregando..."
      logo={<CustomLogo />}
    />
  );
}
```

### Exemplo 3: Com Logo SVG Complexo

```tsx
import LoadingScreen from './LoadingScreen';

function AnimatedLogo() {
  return (
    <svg 
      viewBox="0 0 512 512" 
      className="w-full h-full"
      fill="none"
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6">
            <animate
              attributeName="stop-color"
              values="#3b82f6;#8b5cf6;#ec4899;#f59e0b;#3b82f6"
              dur="10s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="50%" stopColor="#8b5cf6">
            <animate
              attributeName="stop-color"
              values="#8b5cf6;#ec4899;#f59e0b;#3b82f6;#8b5cf6"
              dur="10s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="#ec4899">
            <animate
              attributeName="stop-color"
              values="#ec4899;#f59e0b;#3b82f6;#8b5cf6;#ec4899"
              dur="10s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>
      </defs>
      <path 
        d="M50 50 L100 100 L50 150 L0 100 Z" 
        stroke="url(#logo-gradient)" 
        strokeWidth="5"
        className="animate-pulse"
      />
    </svg>
  );
}

function App() {
  return (
    <LoadingScreen 
      title="Meu App"
      subtitle="Carregando..."
      logo={<AnimatedLogo />}
      logoSize="w-32 h-32 md:w-40 md:h-40"
    />
  );
}
```

### Exemplo 4: Customizando Cores de Fundo

```tsx
import LoadingScreen from './LoadingScreen';

function App() {
  return (
    <LoadingScreen 
      title="Meu App"
      subtitle="Carregando..."
      backgroundColor="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800"
    />
  );
}
```

## 📋 Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `title` | `string` | `"Carregando"` | Título principal exibido no centro |
| `subtitle` | `string` | `"Aguarde..."` | Subtítulo exibido abaixo do título |
| `className` | `string` | `""` | Classe CSS adicional para o container principal |
| `backgroundColor` | `string` | `"bg-slate-50 dark:bg-slate-900"` | Cor de fundo (suporta classes do Tailwind) |
| `logo` | `React.ReactNode` | `undefined` | Componente de logo customizado (opcional) |
| `logoSize` | `string` | `"w-40 h-40 md:w-48 md:h-48 lg:w-56 lg:h-56"` | Tamanho do logo (classes do Tailwind) |
| `strokeWidth` | `number` | `3` | Espessura do contorno do logo animado |

## 🎨 Customização

### Cores dos Círculos

Para customizar as cores dos círculos animados, você pode criar uma versão customizada do componente ou usar CSS:

```css
/* No seu arquivo CSS global */
.custom-loading-circle-1 {
  border-color: rgba(59, 130, 246, 0.2);
  border-top-color: rgb(59, 130, 246);
}

.custom-loading-circle-2 {
  border-color: rgba(139, 92, 246, 0.2);
  border-top-color: rgb(139, 92, 246);
}

.custom-loading-circle-3 {
  border-color: rgba(236, 72, 153, 0.2);
  border-top-color: rgb(236, 72, 153);
}
```

### Velocidades de Animação

As velocidades padrão são:
- Círculo externo (azul): 2s
- Círculo médio (roxo): 1.5s (reverso)
- Círculo interno (rosa): 1s

Para alterar, modifique o `style` inline no componente.

## 🔧 Integração com Next.js

```tsx
// app/page.tsx ou pages/index.tsx
'use client';

import { useState, useEffect } from 'react';
import LoadingScreen from '@/components/LoadingScreen';

export default function HomePage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simula carregamento
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  }, []);

  if (loading) {
    return <LoadingScreen title="Meu App" subtitle="Carregando..." />;
  }

  return <div>Conteúdo da página</div>;
}
```

## 🔧 Integração com React Router

```tsx
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import LoadingScreen from './LoadingScreen';

function App() {
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    setLoading(true);
    // Simula carregamento de dados
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, [location]);

  if (loading) {
    return <LoadingScreen title="Carregando" subtitle="Aguarde..." />;
  }

  return <div>Conteúdo</div>;
}
```

## 🎯 Dicas

1. **Performance**: O componente é leve e não causa problemas de performance
2. **Acessibilidade**: Considere adicionar `aria-label` para leitores de tela
3. **SEO**: Use apenas em client-side rendering (não em SSR inicial)
4. **Customização**: Sinta-se livre para modificar cores, tamanhos e animações

## 📝 Notas

- O componente usa `'use client'` para Next.js App Router
- Se não estiver usando Next.js, você pode remover essa diretiva
- As animações usam classes do Tailwind CSS (`animate-spin`, `animate-pulse`)
- O modo escuro é detectado automaticamente via classes `dark:` do Tailwind

## 🐛 Troubleshooting

### As animações não funcionam
- Certifique-se de que o Tailwind CSS está configurado corretamente
- Verifique se as classes `animate-spin` e `animate-pulse` estão disponíveis

### O modo escuro não funciona
- Certifique-se de que o Tailwind está configurado para suportar dark mode
- Verifique a configuração do `darkMode` no `tailwind.config.js`

### O logo não aparece
- Verifique se o componente de logo está retornando um elemento válido
- Certifique-se de que o `logoSize` está correto

## 📄 Licença

Este componente foi extraído do projeto AdvoSoft e pode ser usado livremente em seus projetos.

---

**Criado com ❤️ para facilitar o desenvolvimento**
