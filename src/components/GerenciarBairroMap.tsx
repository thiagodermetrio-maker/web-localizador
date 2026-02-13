'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MapContainer, TileLayer, Polyline, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import LoadingScreen from '@/components/loadingTela/LoadingScreen';

// Fix para ícones do Leaflet no Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface Point {
  lat: number;
  lng: number;
}

interface Servico {
  dataDeServico: string;
  notasServico: string;
  statusServico: 'Concluído' | 'Pendente' | 'Não Feito';
}

interface Rocada {
  _id: string;
  coordenadasRua: Point[];
  nomeDaRua: string;
  perimetroRocada?: number;
  listaServicos?: Servico[];
  tipo?: 'rua' | 'area';
}

function MapReadyHandler({ onMapReady }: { onMapReady: () => void }) {
  const map = useMap();
  
  useEffect(() => {
    const handleReady = () => {
      onMapReady();
    };
    
    if (map) {
      map.whenReady(handleReady);
    }
    
    return () => {
      if (map) {
        map.off('load', handleReady);
      }
    };
  }, [map, onMapReady]);
  
  return null;
}

function TileLayerReady({ onTilesReady }: { onTilesReady: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onTilesReady();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onTilesReady]);
  return null;
}

function getLineColor(
  listaServicos: Servico[] | undefined, 
  tempoRocagemPad: number,
  isSelected: boolean,
  isInBairro: boolean,
  isInSelectedBairro: boolean
): string {
  // Se estiver selecionada, retorna verde lima
  if (isSelected) {
    return '#ADFF2F'; // Verde lima
  }
  
  // Se estiver no bairro selecionado, retorna amarelo
  if (isInSelectedBairro) {
    return '#FFD700'; // Amarelo
  }
  
  // Se estiver em um bairro, retorna roxo
  if (isInBairro) {
    return '#9370DB'; // Roxo
  }
  
  // Todas as ruas/áreas são vermelhas por padrão
  return '#FF0000';
}

function isPolygon(points: Point[]): boolean {
  if (points.length < 3) return false;
  const first = points[0];
  const last = points[points.length - 1];
  return first.lat === last.lat && first.lng === last.lng;
}

// Componente que atualiza o estilo dinamicamente usando refs do Leaflet
function UpdatablePolyline({ 
  positions, 
  color, 
  weight, 
  opacity,
  isSelected,
  onClick,
  interactive = true
}: { 
  positions: [number, number][]; 
  color: string; 
  weight: number; 
  opacity: number;
  isSelected: boolean;
  onClick?: () => void;
  interactive?: boolean;
}) {
  const polylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    const layer = polylineRef.current;
    if (layer) {
      layer.setStyle({
        color,
        weight,
        opacity,
      });
      console.log('Atualizando estilo Polyline:', { color, weight, opacity });
    }
  }, [color, weight, opacity]);

  return (
    <Polyline
      ref={(ref) => {
        if (ref && typeof ref === 'object' && 'instance' in ref) {
          polylineRef.current = (ref as any).instance as L.Polyline;
        } else if (ref) {
          polylineRef.current = ref as L.Polyline;
        }
      }}
      positions={positions}
      color={color}
      weight={weight}
      opacity={opacity}
      eventHandlers={{
        click: (e) => {
          if (onClick) {
            e.originalEvent.stopPropagation();
            onClick();
          }
        },
      }}
      pathOptions={{
        interactive: interactive,
      }}
    />
  );
}

// Componente que atualiza o estilo dinamicamente para polígonos
function UpdatablePolygon({ 
  positions, 
  color, 
  weight, 
  opacity,
  fillColor,
  fillOpacity,
  isSelected,
  onClick,
  interactive = true
}: { 
  positions: [number, number][]; 
  color: string; 
  weight: number; 
  opacity: number;
  fillColor: string;
  fillOpacity: number;
  isSelected: boolean;
  onClick?: () => void;
  interactive?: boolean;
}) {
  const polygonRef = useRef<L.Polygon | null>(null);

  useEffect(() => {
    const layer = polygonRef.current;
    if (layer) {
      layer.setStyle({
        color,
        weight,
        opacity,
        fillColor,
        fillOpacity,
      });
      console.log('Atualizando estilo Polygon:', { color, weight, opacity, fillColor, fillOpacity });
    }
  }, [color, weight, opacity, fillColor, fillOpacity]);

  return (
    <Polygon
      ref={(ref) => {
        if (ref && typeof ref === 'object' && 'instance' in ref) {
          polygonRef.current = (ref as any).instance as L.Polygon;
        } else if (ref) {
          polygonRef.current = ref as L.Polygon;
        }
      }}
      positions={positions}
      color={color}
      weight={weight}
      opacity={opacity}
      fillColor={fillColor}
      fillOpacity={fillOpacity}
      eventHandlers={{
        click: (e) => {
          if (onClick) {
            e.originalEvent.stopPropagation();
            onClick();
          }
        },
      }}
      pathOptions={{
        interactive: interactive,
      }}
    />
  );
}

export default function GerenciarBairroMap() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [tilesReady, setTilesReady] = useState(false);
  const [rocadas, setRocadas] = useState<Rocada[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [tempoRocagemPad, setTempoRocagemPad] = useState<number>(60);
  const [selecionarRuas, setSelecionarRuas] = useState(false);
  const [ruasSelecionadas, setRuasSelecionadas] = useState<Set<string>>(new Set());
  const [ruasEmBairros, setRuasEmBairros] = useState<Set<string>>(new Set());
  const [bairros, setBairros] = useState<Array<{ _id: string; nome: string; ruas: string[] }>>([]);
  const [bairrosLoaded, setBairrosLoaded] = useState(false);
  const [tipoBairro, setTipoBairro] = useState<string>('Novo Bairro');
  const [nomeBairro, setNomeBairro] = useState<string>('');
  const [bairroSelecionadoId, setBairroSelecionadoId] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'adicionar' | 'alternar'>('adicionar');
  const [tipoBairroAlternar, setTipoBairroAlternar] = useState<string>('');

  useEffect(() => {
    const fetchRocadas = async () => {
      try {
        const response = await fetch('/api/rocada');
        const result = await response.json();
        if (result.success) {
          setRocadas(result.data);
        }
      } catch (error) {
        console.error('Erro ao carregar roçadas:', error);
      } finally {
        setDataLoaded(true);
      }
    };

    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config');
        const result = await response.json();
        if (result.success) {
          setTempoRocagemPad(result.data.tempoRocagemPad || 60);
        }
      } catch (error) {
        console.error('Erro ao carregar configuração:', error);
      } finally {
        setConfigLoaded(true);
      }
    };

    const fetchBairros = async () => {
      try {
        const response = await fetch('/api/bairros');
        const result = await response.json();
        if (result.success) {
          setBairros(result.data);
          // Adicionar todas as ruas dos bairros ao conjunto de ruas em bairros
          const todasRuas = new Set<string>();
          result.data.forEach((bairro: { ruas: string[] }) => {
            bairro.ruas.forEach((ruaId: string) => todasRuas.add(ruaId));
          });
          setRuasEmBairros(todasRuas);
        }
      } catch (error) {
        console.error('Erro ao carregar bairros:', error);
      } finally {
        setBairrosLoaded(true);
      }
    };

    fetchRocadas();
    fetchConfig();
    fetchBairros();
  }, []);

  useEffect(() => {
    if (mapReady && tilesReady && dataLoaded && configLoaded && bairrosLoaded) {
      setLoading(false);
    }
  }, [mapReady, tilesReady, dataLoaded, configLoaded, bairrosLoaded]);

  const handleMapReady = () => {
    setMapReady(true);
  };

  const handleTilesReady = () => {
    setTilesReady(true);
  };

  const handleRocadaClick = (rocadaId: string) => {
    if (!selecionarRuas) return;
    
    const isInBairro = ruasEmBairros.has(rocadaId);
    
    // Na aba "Adicionar Rua": só pode selecionar ruas que NÃO estão em bairros
    if (abaAtiva === 'adicionar' && isInBairro) {
      return; // Não permite selecionar
    }
    
    // Na aba "Alternar Rua": só pode selecionar ruas que JÁ estão em bairros
    if (abaAtiva === 'alternar' && !isInBairro) {
      return; // Não permite selecionar
    }
    
    console.log('Clicou na roçada:', rocadaId);
    setRuasSelecionadas((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rocadaId)) {
        newSet.delete(rocadaId);
        console.log('Deselecionou:', rocadaId);
      } else {
        newSet.add(rocadaId);
        console.log('Selecionou:', rocadaId);
      }
      return newSet;
    });
  };

  const handleAdicionarRuas = async () => {
    if (ruasSelecionadas.size === 0) {
      alert('Selecione pelo menos uma rua para adicionar ao bairro.');
      return;
    }

    if (tipoBairro === 'Novo Bairro') {
      if (!nomeBairro.trim()) {
        alert('Informe um nome para o bairro.');
        return;
      }

      try {
        const response = await fetch('/api/bairros', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nome: nomeBairro.trim(),
            ruas: Array.from(ruasSelecionadas),
          }),
        });

        const result = await response.json();
        if (result.success) {
          // Adicionar as ruas ao conjunto de ruas em bairros
          setRuasEmBairros((prev) => {
            const newSet = new Set(prev);
            ruasSelecionadas.forEach((id) => newSet.add(id));
            return newSet;
          });
          
          // Atualizar lista de bairros
          setBairros((prev) => [...prev, result.data]);
          
          // Limpar seleção
          setRuasSelecionadas(new Set());
          setNomeBairro('');
          setBairroSelecionadoId(null);
          
          console.log('Bairro criado com sucesso:', result.data);
        } else {
          alert('Erro ao criar bairro: ' + result.error);
        }
      } catch (error) {
        console.error('Erro ao criar bairro:', error);
        alert('Erro ao criar bairro. Tente novamente.');
      }
    } else {
      // Atualizar bairro existente
      try {
        const response = await fetch(`/api/bairros/${tipoBairro}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ruas: Array.from(ruasSelecionadas),
          }),
        });

        const result = await response.json();
        if (result.success) {
          // Adicionar as ruas ao conjunto de ruas em bairros
          setRuasEmBairros((prev) => {
            const newSet = new Set(prev);
            ruasSelecionadas.forEach((id) => newSet.add(id));
            return newSet;
          });
          
          // Atualizar lista de bairros
          setBairros((prev) =>
            prev.map((b) => (b._id === tipoBairro ? result.data : b))
          );
          
          // Limpar seleção
          setRuasSelecionadas(new Set());
          
          console.log('Bairro atualizado com sucesso:', result.data);
        } else {
          alert('Erro ao atualizar bairro: ' + result.error);
        }
      } catch (error) {
        console.error('Erro ao atualizar bairro:', error);
        alert('Erro ao atualizar bairro. Tente novamente.');
      }
    }
  };

  const handleBairroChange = (bairroId: string) => {
    setTipoBairro(bairroId);
    if (bairroId === 'Novo Bairro') {
      setBairroSelecionadoId(null);
    } else {
      setBairroSelecionadoId(bairroId);
    }
  };

  const handleAlternarRuas = async () => {
    if (ruasSelecionadas.size === 0) {
      alert('Selecione pelo menos uma rua para alternar de bairro.');
      return;
    }

    if (!tipoBairroAlternar) {
      alert('Selecione um bairro de destino.');
      return;
    }

    try {
      const ruasArray = Array.from(ruasSelecionadas);
      
      // Identificar quais bairros contêm essas ruas
      const bairrosParaAtualizar = new Map<string, string[]>(); // Map<bairroId, [ruaIds]>
      
      bairros.forEach((bairro) => {
        const ruasNoBairro = bairro.ruas.filter((ruaId) => ruasArray.includes(ruaId));
        if (ruasNoBairro.length > 0) {
          bairrosParaAtualizar.set(bairro._id, ruasNoBairro);
        }
      });

      // Remover ruas dos bairros atuais
      const removerPromises = Array.from(bairrosParaAtualizar.entries()).map(
        async ([bairroId, ruasParaRemover]) => {
          const response = await fetch(`/api/bairros/${bairroId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              operacao: 'remover',
              ruas: ruasParaRemover,
            }),
          });
          return response.json();
        }
      );

      await Promise.all(removerPromises);

      // Adicionar ruas ao bairro de destino
      const response = await fetch(`/api/bairros/${tipoBairroAlternar}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ruas: ruasArray,
        }),
      });

      const result = await response.json();
      if (result.success) {
        // Atualizar lista de bairros
        const bairrosAtualizados = await fetch('/api/bairros');
        const bairrosResult = await bairrosAtualizados.json();
        if (bairrosResult.success) {
          setBairros(bairrosResult.data);
          
          // Atualizar conjunto de ruas em bairros (todas as ruas de todos os bairros)
          const todasRuas = new Set<string>();
          bairrosResult.data.forEach((bairro: { ruas: string[] }) => {
            bairro.ruas.forEach((ruaId: string) => todasRuas.add(ruaId));
          });
          setRuasEmBairros(todasRuas);
        }
        
        // Limpar seleção
        setRuasSelecionadas(new Set());
        setTipoBairroAlternar('');
        
        console.log('Ruas alternadas com sucesso');
      } else {
        alert('Erro ao alternar ruas: ' + result.error);
      }
    } catch (error) {
      console.error('Erro ao alternar ruas:', error);
      alert('Erro ao alternar ruas. Tente novamente.');
    }
  };

  return (
    <div className="relative h-screen w-full">
      {loading && (
        <div className="fixed inset-0 z-[3000]">
          <LoadingScreen 
            title="RM Manager"
            subtitle="Carregando mapa..."
          />
        </div>
      )}
      
      {/* Header Fixo */}
      <header className="fixed top-0 left-0 right-0 z-[2000] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-xl border-b border-slate-700/50 backdrop-blur-sm">
        <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            {/* Logo e Título - Ocultos em telas pequenas */}
            <div className="hidden md:flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 opacity-30"></div>
                <img 
                  src="/logo.svg" 
                  alt="RM Manager Logo" 
                  className="w-8 h-8 relative z-10"
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.8)) drop-shadow(0 0 15px rgba(139, 92, 246, 0.6)) drop-shadow(0 0 20px rgba(236, 72, 153, 0.4))',
                  }}
                />
              </div>
              <h1 className="text-xl xl:text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent whitespace-nowrap">
                RM Manager - Gerenciar Bairros
              </h1>
            </div>
            
            {/* Título Mobile */}
            <div className="md:hidden flex items-center gap-2">
              <h1 className="text-base font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Gerenciar Bairros
              </h1>
            </div>

            {/* Navegação */}
            <nav className="flex items-center gap-2 sm:gap-3 ml-auto">
              <button
                onClick={() => router.push('/')}
                className="p-2 sm:p-2.5 border-2 border-slate-500 text-slate-400 font-medium rounded-lg bg-transparent hover:border-slate-400 hover:text-slate-300 active:scale-95 transition-all duration-200 ease-out hover:shadow-lg"
                title="Voltar"
              >
                <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <button
                onClick={() => {
                  const novoEstado = !selecionarRuas;
                  setSelecionarRuas(novoEstado);
                  if (!novoEstado) {
                    setRuasSelecionadas(new Set()); // Limpar seleção ao desativar
                  }
                }}
                className={`px-3 py-2 sm:px-5 sm:py-2.5 border-2 font-medium rounded-lg bg-transparent active:scale-95 transition-all duration-200 ease-out hover:shadow-lg text-sm sm:text-base ${
                  selecionarRuas
                    ? 'border-blue-500 text-blue-400 hover:border-blue-400 hover:text-blue-300 hover:shadow-blue-500/50'
                    : 'border-slate-500 text-slate-400 hover:border-slate-400 hover:text-slate-300'
                }`}
              >
                <span className="hidden sm:inline">{selecionarRuas ? 'Desativar Seleção' : 'Selecionar Ruas'}</span>
                <span className="sm:hidden">{selecionarRuas ? 'Desativar' : 'Selecionar'}</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Painel de Adicionar Ruas - Card */}
      {selecionarRuas && (
        <div className="fixed top-[85px] left-1/2 transform -translate-x-1/2 z-[1999] w-full max-w-4xl px-4">
          <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 rounded-xl shadow-2xl border border-slate-600/50 backdrop-blur-sm">
            {/* Sistema de Abas */}
            <div className="flex border-b border-slate-600/50">
              <button
                onClick={() => {
                  setAbaAtiva('adicionar');
                  setRuasSelecionadas(new Set()); // Limpar seleção ao trocar de aba
                }}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-all duration-200 ${
                  abaAtiva === 'adicionar'
                    ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800/50'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Adicionar Rua
              </button>
              <button
                onClick={() => {
                  setAbaAtiva('alternar');
                  setRuasSelecionadas(new Set()); // Limpar seleção ao trocar de aba
                }}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-all duration-200 ${
                  abaAtiva === 'alternar'
                    ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800/50'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Alternar Rua
              </button>
            </div>

            {/* Conteúdo da Aba Adicionar */}
            {abaAtiva === 'adicionar' && (
              <div className="p-6">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">
                      Selecionar Bairro
                    </label>
                    <select
                      value={tipoBairro}
                      onChange={(e) => handleBairroChange(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900/70 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    >
                      <option value="Novo Bairro">Novo Bairro</option>
                      {bairros.map((bairro) => (
                        <option key={bairro._id} value={bairro._id}>
                          {bairro.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {tipoBairro === 'Novo Bairro' && (
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">
                        Nome do Bairro
                      </label>
                      <input
                        type="text"
                        value={nomeBairro}
                        onChange={(e) => setNomeBairro(e.target.value)}
                        placeholder="Digite o nome do bairro"
                        className="w-full px-4 py-2.5 bg-slate-900/70 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-end">
                    <button
                      onClick={handleAdicionarRuas}
                      className="px-6 py-2.5 border-2 border-blue-500 text-blue-400 font-medium rounded-lg bg-transparent hover:border-blue-400 hover:text-blue-300 hover:shadow-blue-500/50 active:scale-95 transition-all duration-200 ease-out"
                    >
                      Adicionar Ruas
                    </button>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-400">
                  {ruasSelecionadas.size} {ruasSelecionadas.size === 1 ? 'rua selecionada' : 'ruas selecionadas'}
                </div>
              </div>
            )}

            {/* Conteúdo da Aba Alternar */}
            {abaAtiva === 'alternar' && (
              <div className="p-6">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">
                      Selecionar Bairro
                    </label>
                    <select
                      value={tipoBairroAlternar}
                      onChange={(e) => setTipoBairroAlternar(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900/70 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    >
                      <option value="">Selecione um bairro</option>
                      {bairros.map((bairro) => (
                        <option key={bairro._id} value={bairro._id}>
                          {bairro.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-end">
                    <button
                      onClick={handleAlternarRuas}
                      className="px-6 py-2.5 border-2 border-blue-500 text-blue-400 font-medium rounded-lg bg-transparent hover:border-blue-400 hover:text-blue-300 hover:shadow-blue-500/50 active:scale-95 transition-all duration-200 ease-out"
                    >
                      Alternar Ruas
                    </button>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-400">
                  {ruasSelecionadas.size} {ruasSelecionadas.size === 1 ? 'rua selecionada' : 'ruas selecionadas'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div 
        className="h-screen w-full" 
        style={{ 
          cursor: selecionarRuas ? 'pointer' : 'default',
          paddingTop: '73px'
        }}
      >
        <MapContainer
          center={[-25.82020123877223, -48.53679568468259]}
          zoom={13}
          maxZoom={30}
          style={{ height: 'calc(100vh - 73px)', width: '100%' }}
        >
          <MapReadyHandler onMapReady={handleMapReady} />
          <TileLayer
            attribution='&copy; Google Maps'
            url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
            maxZoom={30}
            maxNativeZoom={20}
          />
          <TileLayerReady onTilesReady={handleTilesReady} />
          
          {rocadas.map((rocada) => {
            const positions = rocada.coordenadasRua.map((p) => [p.lat, p.lng] as [number, number]);
            const isPoly = rocada.tipo === 'area' || isPolygon(rocada.coordenadasRua);
            const isSelected = ruasSelecionadas.has(rocada._id);
            const isInBairro = ruasEmBairros.has(rocada._id);
            const bairroSelecionado = bairros.find((b) => b._id === bairroSelecionadoId);
            const isInSelectedBairro = bairroSelecionado?.ruas.includes(rocada._id) || false;
            
            // Verificar se a rua pode ser selecionada baseado na aba ativa
            let canBeSelected = true;
            if (selecionarRuas) {
              if (abaAtiva === 'adicionar' && isInBairro) {
                canBeSelected = false;
              } else if (abaAtiva === 'alternar' && !isInBairro) {
                canBeSelected = false;
              }
            }
            
            const lineColor = getLineColor(rocada.listaServicos, tempoRocagemPad, isSelected, isInBairro, isInSelectedBairro);
            
            if (isPoly && positions.length >= 3) {
              return (
                <UpdatablePolygon
                  key={`${rocada._id}-${isSelected ? 'selected' : 'unselected'}`}
                  positions={[...positions, positions[0]]}
                  color={lineColor}
                  weight={isSelected ? 6 : 3}
                  opacity={0.7}
                  fillColor={lineColor}
                  fillOpacity={isSelected ? 0.4 : 0.2}
                  isSelected={isSelected}
                  onClick={selecionarRuas && canBeSelected ? () => handleRocadaClick(rocada._id) : undefined}
                  interactive={true}
                />
              );
            } else if (positions.length >= 2) {
              return (
                <UpdatablePolyline
                  key={`${rocada._id}-${isSelected ? 'selected' : 'unselected'}`}
                  positions={positions}
                  color={lineColor}
                  weight={isSelected ? 8 : 5}
                  opacity={0.7}
                  isSelected={isSelected}
                  onClick={selecionarRuas && canBeSelected ? () => handleRocadaClick(rocada._id) : undefined}
                  interactive={true}
                />
              );
            }
            return null;
          })}
        </MapContainer>
      </div>
    </div>
  );
}
