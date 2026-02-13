'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MapContainer, TileLayer, Polyline, Polygon, Popup, Marker, useMap } from 'react-leaflet';
import { Marker as LeafletMarker } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import LoadingScreen from '@/components/loadingTela/LoadingScreen';
import TabelaNecessidade from '@/components/TabelaNecessidade';
import { GrUserWorker } from 'react-icons/gr';
import { renderToString } from 'react-dom/server';

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
  dataCadastro?: string;
  comprimento?: number;
  perimetroRocada?: number;
  listaServicos?: Servico[];
  notasSobreRua?: string;
  tempoCortePersonalizado?: number | null;
  tipo?: 'rua' | 'area';
}

interface Coordenada {
  dataHorario: string;
  coordenada: {
    lat: number;
    lng: number;
  };
}

interface LocalizadorUsuario {
  _id: string;
  nomeUsuario: string;
  listaCoordenadas: Coordenada[];
  createdAt: string;
  updatedAt: string;
}

// Função para criar ícone customizado do usuário trabalhador
function createUserWorkerIcon(isRecent: boolean = true) {
  return L.divIcon({
    className: 'custom-user-worker-icon',
    html: `<div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background-color: #3b82f6;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      opacity: ${isRecent ? '1' : '0.3'};
    ">
      <div style="
        width: 24px;
        height: 24px;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      ">
        👷
      </div>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
}

// Componente para renderizar os marcadores de um usuário
function UserLocationMarkers({ localizador }: { localizador: LocalizadorUsuario }) {
  if (!localizador.listaCoordenadas || localizador.listaCoordenadas.length === 0) {
    return null;
  }

  // Ordenar coordenadas por data (mais recente primeiro)
  const coordenadasOrdenadas = [...localizador.listaCoordenadas].sort(
    (a, b) => new Date(b.dataHorario).getTime() - new Date(a.dataHorario).getTime()
  );

  // Preparar posições para a linha tracejada (da mais nova para a mais antiga)
  const positions: [number, number][] = coordenadasOrdenadas.map(
    (coord) => [coord.coordenada.lat, coord.coordenada.lng]
  );

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const formatFiscalName = (nomeUsuario: string): string => {
    const match = nomeUsuario.match(/^([a-zA-Z]+)(\d+)$/);
    if (match) {
      const prefix = match[1].charAt(0).toUpperCase() + match[1].slice(1);
      const number = match[2];
      return `${prefix} ${number}`;
    }
    return nomeUsuario;
  };

  return (
    <>
      {/* Linha tracejada conectando todas as coordenadas */}
      {positions.length > 1 && (
        <Polyline
          positions={positions}
          color="#3b82f6"
          weight={2}
          opacity={0.6}
          dashArray="5, 10"
        />
      )}

      {/* Marcadores para cada coordenada */}
      {coordenadasOrdenadas.map((coord, index) => {
        const isRecent = index === 0; // Primeira coordenada é a mais recente
        return (
          <Marker
            key={`${localizador._id}-${index}`}
            position={[coord.coordenada.lat, coord.coordenada.lng]}
            icon={createUserWorkerIcon(isRecent)}
            opacity={isRecent ? 1 : 0.3}
          >
            <Popup>
              <div className="min-w-[280px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg overflow-hidden shadow-2xl border border-slate-700/50">
                {/* Header do Popup */}
                <div className="relative bg-gradient-to-r from-orange-500/20 via-orange-400/20 to-orange-500/20 border-b border-orange-500/30 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                      <span className="text-2xl">👷</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-base font-bold bg-gradient-to-r from-orange-400 to-orange-300 bg-clip-text text-transparent">
                        {formatFiscalName(localizador.nomeUsuario)}
                      </div>
                      {isRecent && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                          <span className="text-xs text-green-400 font-medium">Online</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Conteúdo do Popup */}
                <div className="px-4 py-3 space-y-3">
                  {/* Data e Hora */}
                  <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs font-semibold text-blue-400">Horário</span>
                    </div>
                    <div className="text-sm text-slate-300 font-medium ml-6">
                      {formatDateTime(coord.dataHorario)}
                    </div>
                  </div>

                  {/* Coordenadas */}
                  <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-xs font-semibold text-purple-400">Coordenadas</span>
                    </div>
                    <div className="space-y-1 ml-6">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Latitude:</span>
                        <span className="text-sm text-slate-300 font-mono">
                          {coord.coordenada.lat.toFixed(6)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Longitude:</span>
                        <span className="text-sm text-slate-300 font-mono">
                          {coord.coordenada.lng.toFixed(6)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badge de Status */}
                  {isRecent && (
                    <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-lg px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-bold text-green-400">Localização Mais Recente</span>
                      </div>
                    </div>
                  )}

                  {!isRecent && (
                    <div className="bg-gradient-to-r from-slate-700/30 to-slate-600/30 border border-slate-600/50 rounded-lg px-3 py-2 text-center">
                      <span className="text-xs font-medium text-slate-400">Localização Anterior</span>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
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

// Componente para controlar o mapa e mover até uma roçada
function MapController({ 
  focusRocadaId, 
  rocadas, 
  onFocusComplete 
}: { 
  focusRocadaId: string | null; 
  rocadas: Rocada[];
  onFocusComplete?: () => void;
}) {
  const map = useMap();
  
  useEffect(() => {
    if (!focusRocadaId || !map) return;
    
    const rocada = rocadas.find((r) => r._id === focusRocadaId);
    if (!rocada || !rocada.coordenadasRua || rocada.coordenadasRua.length === 0) return;
    
    // Calcular o centro das coordenadas
    const coords = rocada.coordenadasRua;
    let centerLat = 0;
    let centerLng = 0;
    
    coords.forEach((coord) => {
      centerLat += coord.lat;
      centerLng += coord.lng;
    });
    
    centerLat /= coords.length;
    centerLng /= coords.length;
    
    // Criar bounds para ajustar o zoom
    const bounds = L.latLngBounds(coords.map((c) => [c.lat, c.lng] as [number, number]));
    
    // Mover o mapa suavemente até a roçada
    map.flyToBounds(bounds, {
      padding: [50, 50], // Padding em pixels
      duration: 1.5, // Duração da animação em segundos
      easeLinearity: 0.25
    });
    
    if (onFocusComplete) {
      setTimeout(() => {
        onFocusComplete();
      }, 1500);
    }
  }, [focusRocadaId, rocadas, map, onFocusComplete]);
  
  return null;
}

function LocalizadorController({
  focusLocalizadorId,
  localizadores,
  onFocusComplete
}: {
  focusLocalizadorId: string | null;
  localizadores: LocalizadorUsuario[];
  onFocusComplete?: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!focusLocalizadorId || !map) return;

    const localizador = localizadores.find((l) => l._id === focusLocalizadorId);
    if (!localizador || !localizador.listaCoordenadas || localizador.listaCoordenadas.length === 0) return;

    // Pegar a coordenada mais recente (primeira após ordenação)
    const coordenadasOrdenadas = [...localizador.listaCoordenadas].sort(
      (a, b) => new Date(b.dataHorario).getTime() - new Date(a.dataHorario).getTime()
    );

    const ultimaCoordenada = coordenadasOrdenadas[0];

    // Mover o mapa suavemente até a última localização do fiscal
    map.flyTo(
      [ultimaCoordenada.coordenada.lat, ultimaCoordenada.coordenada.lng],
      17, // Zoom level
      {
        duration: 1.5, // Duração da animação em segundos
        easeLinearity: 0.25
      }
    );

    // Resetar o focusLocalizadorId após a animação
    if (onFocusComplete) {
      setTimeout(() => {
        onFocusComplete();
      }, 1500);
    }
  }, [focusLocalizadorId, map, onFocusComplete]);

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

function TileLayerLeafletReady({ onTilesReady }: { onTilesReady: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onTilesReady();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onTilesReady]);
  return null;
}

// Componente para detectar cliques no mapa durante edição
function MapClickHandlerEdit({ 
  onMapClick, 
  enabled 
}: { 
  onMapClick: (point: Point) => void;
  enabled: boolean;
}) {
  const map = useMap();
  
  useEffect(() => {
    if (!enabled) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      // Não adicionar ponto se clicou em uma feature interativa (marcador, linha, etc)
      const target = e.originalEvent.target as HTMLElement;
      if (target && (target.classList.contains('leaflet-interactive') || target.closest('.leaflet-interactive'))) {
        return;
      }
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onMapClick, enabled]);
  
  return null;
}

// Componente de marcador arrastável para edição
interface DraggableMarkerProps {
  point: Point;
  index: number;
  onDragEnd: (index: number, newPosition: Point) => void;
  onRemove?: (index: number) => void;
}

function DraggableMarker({ point, index, onDragEnd, onRemove }: DraggableMarkerProps) {
  const eventHandlers = {
    dragend: (e: { target: LeafletMarker }) => {
      const marker = e.target;
      const position = marker.getLatLng();
      onDragEnd(index, { lat: position.lat, lng: position.lng });
    },
    contextmenu: (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      if (onRemove) {
        onRemove(index);
      }
    },
  };

  return (
    <Marker
      position={[point.lat, point.lng]}
      draggable={true}
      eventHandlers={eventHandlers}
    />
  );
}

// Componente Polyline com cor animada para edição
function AnimatedEditingPolyline({ positions }: { positions: [number, number][] }) {
  const [color, setColor] = useState('#00ff00');
  const map = useMap();

  useEffect(() => {
    const interval = setInterval(() => {
      setColor((prev) => prev === '#00ff00' ? '#3b82f6' : '#00ff00');
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const polyline = L.polyline(positions as L.LatLngExpression[], {
      color,
      weight: 8,
      opacity: 0.9,
    }).addTo(map);

    return () => {
      map.removeLayer(polyline);
    };
  }, [map, positions, color]);

  return null;
}

function PopupContent({ 
  nomeDaRua, 
  perimetroRocada, 
  listaServicos,
  rocadaId,
  onRocadaUpdated,
  tempoRocagemPad,
  tempoCortePersonalizado,
  onEdit
}: { 
  nomeDaRua: string;
  perimetroRocada?: number;
  listaServicos?: Servico[];
  rocadaId: string;
  onRocadaUpdated: (updatedRocada: Rocada) => void;
  tempoRocagemPad: number;
  tempoCortePersonalizado?: number | null;
  onEdit: (rocadaId: string) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [dataDeServico, setDataDeServico] = useState<string>('');
  const [statusServico, setStatusServico] = useState<'Concluído' | 'Pendente' | 'Não Feito'>('Concluído');
  const [notasServico, setNotasServico] = useState<string>('');

  // Customizar estilo do popup do Leaflet
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'leaflet-popup-custom-style';
    style.textContent = `
      .leaflet-popup-content-wrapper {
        background: #0f172a !important;
        border-radius: 12px !important;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2) !important;
        padding: 0 !important;
        border: 1px solid #334155 !important;
      }
      .leaflet-popup-content {
        margin: 0 !important;
      }
      .leaflet-popup-tip {
        background: #0f172a !important;
        box-shadow: none !important;
      }
      .leaflet-popup-close-button {
        color: #ef4444 !important;
        font-size: 24px !important;
        font-weight: bold !important;
        padding: 4px 8px !important;
        text-decoration: none !important;
        transition: all 0.2s ease !important;
        width: 30px !important;
        height: 30px !important;
        line-height: 30px !important;
      }
      .leaflet-popup-close-button:hover {
        color: #dc2626 !important;
        background: rgba(239, 68, 68, 0.2) !important;
        border-radius: 4px !important;
      }
      .editing-line {
        stroke-dasharray: 10, 5;
        animation: colorPulse 2s ease-in-out infinite;
      }
      @keyframes colorPulse {
        0%, 100% {
          stroke: #00ff00;
        }
        50% {
          stroke: #3b82f6;
        }
      }
    `;
    
    // Remover estilo anterior se existir
    const existingStyle = document.getElementById('leaflet-popup-custom-style');
    if (existingStyle) {
      document.head.removeChild(existingStyle);
    }
    
    document.head.appendChild(style);
    return () => {
      const styleToRemove = document.getElementById('leaflet-popup-custom-style');
      if (styleToRemove) {
        document.head.removeChild(styleToRemove);
      }
    };
  }, []);

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} às ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  };

  const getUltimoServico = () => {
    if (!listaServicos || listaServicos.length === 0) {
      return null;
    }
    
    const servicosOrdenados = [...listaServicos].sort((a, b) => {
      return new Date(b.dataDeServico).getTime() - new Date(a.dataDeServico).getTime();
    });
    
    return servicosOrdenados[0];
  };

  const getUltimoCorte = (): string => {
    const ultimoServico = getUltimoServico();
    if (!ultimoServico) {
      return 'Nenhum corte registrado';
    }
    return formatDate(ultimoServico.dataDeServico);
  };

  const getNecessidadeCorte = (): number => {
    const ultimoServico = getUltimoServico();
    if (!ultimoServico) {
      return 100; // Se não há serviços, 100% de necessidade
    }

    const dataUltimoServico = new Date(ultimoServico.dataDeServico);
    const hoje = new Date();
    const diasDesdeUltimoServico = Math.floor((hoje.getTime() - dataUltimoServico.getTime()) / (1000 * 60 * 60 * 24));

    // Se acabou de ser cortado (0 dias), retorna 0%
    if (diasDesdeUltimoServico <= 0) {
      return 0;
    }

    // Usar tempoCortePersonalizado se disponível, senão usar tempoRocagemPad
    const tempoReferencia = tempoCortePersonalizado !== null && tempoCortePersonalizado !== undefined ? tempoCortePersonalizado : tempoRocagemPad;

    // Se faz tempoReferencia ou mais, retorna 100%
    if (diasDesdeUltimoServico >= tempoReferencia) {
      return 100;
    }

    // Progressão linear entre 0 e tempoReferencia
    const porcentagem = (diasDesdeUltimoServico / tempoReferencia) * 100;
    return Math.min(100, Math.max(0, Math.round(porcentagem)));
  };

  const getCurrentDateTime = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatDateTimeForNotes = (dateTimeString: string): string => {
    const date = new Date(dateTimeString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  };

  const updateNotasServico = (status: 'Concluído' | 'Pendente' | 'Não Feito', dataServico: string) => {
    const formattedDate = formatDateTimeForNotes(dataServico);
    let nota = '';

    if (status === 'Concluído') {
      nota = `Serviço Concluído dia ${formattedDate}`;
    } else if (status === 'Pendente') {
      nota = `Serviço Pendente dia ${formattedDate}`;
    } else if (status === 'Não Feito') {
      nota = `Serviço Não Feito dia ${formattedDate}`;
    }

    setNotasServico(nota);
  };

  const handleAdicionarServico = () => {
    const currentDateTime = getCurrentDateTime();
    setDataDeServico(currentDateTime);
    setStatusServico('Concluído');
    updateNotasServico('Concluído', currentDateTime);
    setShowModal(true);
  };

  const handleConfirm = async () => {
    const novoServico = {
      dataDeServico: dataDeServico,
      notasServico: notasServico,
      statusServico: statusServico,
    };

    // Verificar o último serviço da lista
    if (!listaServicos || listaServicos.length === 0) {
      // Se não há serviços, adiciona o novo normalmente
      const listaAtualizada = [novoServico];
      
      try {
        const response = await fetch(`/api/rocada/${rocadaId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ listaServicos: listaAtualizada }),
        });

      const result = await response.json();
      if (result.success) {
        console.log('Rocada atualizada:', result.data);
        onRocadaUpdated(result.data);
        setShowModal(false);
      } else {
        console.error('Erro ao atualizar roçada:', result.error);
        alert('Erro ao salvar serviço. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao atualizar roçada:', error);
      alert('Erro ao salvar serviço. Tente novamente.');
    }
    return;
    }

    // Ordenar por dataDeServico (mais recente primeiro)
    const servicosOrdenados = [...listaServicos].sort((a, b) => {
      return new Date(b.dataDeServico).getTime() - new Date(a.dataDeServico).getTime();
    });

    const ultimoServico = servicosOrdenados[0];
    let listaAtualizada: Servico[];

    if (ultimoServico.statusServico === 'Pendente') {
      // Se o último é 'Pendente', concatena as notas no último serviço
      const notasAtualizadas = ultimoServico.notasServico 
        ? `${ultimoServico.notasServico}\n${notasServico}`
        : notasServico;
      
      // Se o novo serviço é 'Concluído', também muda o status do último serviço
      const novoStatus: 'Concluído' | 'Pendente' | 'Não Feito' = statusServico === 'Concluído' ? 'Concluído' : ultimoServico.statusServico;
      
      const servicoAtualizado = {
        ...ultimoServico,
        notasServico: notasAtualizadas,
        statusServico: novoStatus,
      };

      // Substituir o último serviço pelo atualizado e manter os demais
      listaAtualizada = [
        servicoAtualizado,
        ...servicosOrdenados.slice(1),
      ];
    } else {
      // Se o último é 'Concluído' ou 'Não Feito', adiciona o novo serviço
      listaAtualizada = [
        novoServico,
        ...servicosOrdenados,
      ];
    }

    try {
      const response = await fetch(`/api/rocada/${rocadaId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ listaServicos: listaAtualizada }),
      });

      const result = await response.json();
      if (result.success) {
        console.log('Rocada atualizada:', result.data);
        onRocadaUpdated(result.data);
        setShowModal(false);
      } else {
        console.error('Erro ao atualizar roçada:', result.error);
        alert('Erro ao salvar serviço. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao atualizar roçada:', error);
      alert('Erro ao salvar serviço. Tente novamente.');
    }
  };

  const necessidadeCorte = getNecessidadeCorte();
  const getNecessidadeColor = () => {
    if (necessidadeCorte <= 20) return 'text-green-400';
    if (necessidadeCorte <= 40) return 'text-green-300';
    if (necessidadeCorte <= 60) return 'text-yellow-400';
    if (necessidadeCorte <= 80) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <>
      <div className="min-w-[280px] max-w-[320px] bg-slate-900 rounded-xl overflow-hidden">
        {/* Header com gradiente */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 p-4 border-b border-slate-700">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>
          <h3 className="relative z-10 text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            {nomeDaRua}
          </h3>
        </div>

        {/* Conteúdo */}
        <div className="bg-slate-900/95 backdrop-blur-sm p-4 space-y-3 border-x border-slate-700">
          {/* Perímetro */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Perímetro de Roçada</span>
            <span className="text-sm font-semibold text-slate-200">
              {perimetroRocada ? perimetroRocada.toFixed(2) : 'N/A'} <span className="text-slate-500">m²</span>
            </span>
          </div>

          {/* Último Corte */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Último Corte</span>
            <span className="text-sm font-medium text-slate-300">{getUltimoCorte()}</span>
          </div>

          {/* Necessidade de Corte */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Necessidade</span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-16 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    necessidadeCorte <= 20 ? 'bg-gradient-to-r from-green-500 to-green-400' :
                    necessidadeCorte <= 40 ? 'bg-gradient-to-r from-green-400 to-green-300' :
                    necessidadeCorte <= 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                    necessidadeCorte <= 80 ? 'bg-gradient-to-r from-orange-500 to-orange-400' :
                    'bg-gradient-to-r from-red-500 to-red-400'
                  }`}
                  style={{ width: `${necessidadeCorte}%` }}
                ></div>
              </div>
              <span className={`text-sm font-bold ${getNecessidadeColor()}`}>
                {necessidadeCorte}%
              </span>
            </div>
          </div>

          {/* Notas Pendentes */}
          {(() => {
            const ultimoServico = getUltimoServico();
            if (ultimoServico && ultimoServico.statusServico === 'Pendente' && ultimoServico.notasServico) {
              return (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Notas Pendentes</span>
                  </div>
                  <p className="text-xs text-amber-300 leading-relaxed whitespace-pre-wrap">{ultimoServico.notasServico}</p>
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* Botões */}
        <div className="flex gap-2 p-4 bg-slate-900/95 backdrop-blur-sm border-x border-b border-slate-700">
          <button
            onClick={handleAdicionarServico}
            className="flex-1 px-4 py-2.5 border-2 border-green-500 text-green-400 font-medium rounded-lg bg-transparent hover:border-green-400 hover:text-green-300 active:scale-95 transition-all duration-200 ease-out hover:shadow-lg hover:shadow-green-500/50 text-sm"
          >
            Adicionar Serviço
          </button>
          <button
            onClick={() => onEdit(rocadaId)}
            className="flex-1 px-4 py-2.5 border-2 border-slate-500 text-slate-400 font-medium rounded-lg bg-transparent hover:border-slate-400 hover:text-slate-300 active:scale-95 transition-all duration-200 ease-out hover:shadow-lg text-sm"
          >
            Editar
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header do Modal */}
            <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 p-6 border-b border-slate-700">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>
              <h2 className="relative z-10 text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Adicionar Serviço
              </h2>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Data de Serviço
                </label>
                <input
                  type="datetime-local"
                  value={dataDeServico}
                  onChange={(e) => {
                    setDataDeServico(e.target.value);
                    updateNotasServico(statusServico, e.target.value);
                  }}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Status do Serviço
                </label>
                <select
                  value={statusServico}
                  onChange={(e) => {
                    const newStatus = e.target.value as 'Concluído' | 'Pendente' | 'Não Feito';
                    setStatusServico(newStatus);
                    updateNotasServico(newStatus, dataDeServico);
                  }}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                >
                  <option value="Concluído" className="bg-slate-800">Concluído</option>
                  <option value="Pendente" className="bg-slate-800">Pendente</option>
                  <option value="Não Feito" className="bg-slate-800">Não Feito</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Notas do Serviço
                </label>
                <textarea
                  value={notasServico}
                  onChange={(e) => setNotasServico(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all resize-none"
                  placeholder="Digite as notas do serviço..."
                />
              </div>
            </div>

            {/* Botões do Modal */}
            <div className="flex gap-3 p-6 pt-0 border-t border-slate-700">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border-2 border-slate-600 text-slate-400 font-medium rounded-lg bg-transparent hover:border-slate-500 hover:text-slate-300 active:scale-95 transition-all duration-200 ease-out"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2.5 border-2 border-blue-500 text-blue-400 font-medium rounded-lg bg-transparent hover:border-blue-400 hover:text-blue-300 active:scale-95 transition-all duration-200 ease-out hover:shadow-lg hover:shadow-blue-500/50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function getLineColor(listaServicos: Servico[] | undefined, tempoRocagemPad: number, tempoCortePersonalizado?: number | null): string {
  if (!listaServicos || listaServicos.length === 0) {
    // Se não há serviços, retorna vermelho (mais crítico)
    return '#FF0000';
  }

  // Ordenar por dataDeServico (mais recente primeiro)
  const servicosOrdenados = [...listaServicos].sort((a, b) => {
    return new Date(b.dataDeServico).getTime() - new Date(a.dataDeServico).getTime();
  });

  const ultimoServico = servicosOrdenados[0];
  
  // Se o último serviço tem status "Pendente", retorna rosa
  if (ultimoServico.statusServico === 'Pendente') {
    return '#FF69B4'; // Rosa
  }
  
  const dataUltimoServico = new Date(ultimoServico.dataDeServico);
  const hoje = new Date();
  const diasDesdeUltimoServico = Math.floor((hoje.getTime() - dataUltimoServico.getTime()) / (1000 * 60 * 60 * 24));

  // Usar tempoCortePersonalizado se disponível, senão usar tempoRocagemPad
  const tempoReferencia = tempoCortePersonalizado !== null && tempoCortePersonalizado !== undefined ? tempoCortePersonalizado : tempoRocagemPad;

  // Calcular as faixas baseadas em 20% do tempoReferencia
  const faixa1 = tempoReferencia * 0.2;  // 0-20%
  const faixa2 = tempoReferencia * 0.4;  // 20-40%
  const faixa3 = tempoReferencia * 0.6;  // 40-60%
  const faixa4 = tempoReferencia * 0.8;  // 60-80%

  if (diasDesdeUltimoServico < faixa1) {
    return '#228B22'; // Verde escuro
  } else if (diasDesdeUltimoServico < faixa2) {
    return '#32CD32'; // Verde claro
  } else if (diasDesdeUltimoServico < faixa3) {
    return '#FFD700'; // Amarelo
  } else if (diasDesdeUltimoServico < faixa4) {
    return '#FF8C00'; // Laranja
  } else {
    return '#FF0000'; // Vermelho
  }
}

function HighlightablePolygon({ 
  positions, 
  id, 
  nomeDaRua, 
  perimetroRocada, 
  listaServicos,
  onRocadaUpdated,
  tempoRocagemPad,
  tempoCortePersonalizado,
  highlightedRocadaId,
  onEdit
}: { 
  positions: [number, number][]; 
  id: string;
  nomeDaRua: string;
  perimetroRocada?: number;
  listaServicos?: Servico[];
  onRocadaUpdated: (updatedRocada: Rocada) => void;
  tempoRocagemPad: number;
  tempoCortePersonalizado?: number | null;
  highlightedRocadaId?: string | null;
  onEdit: (rocadaId: string) => void;
}) {
  const map = useMap();
  const polygonRef = useRef<L.Polygon | null>(null);
  // Verificar se o último serviço é 'Pendente'
  const getUltimoServico = () => {
    if (!listaServicos || listaServicos.length === 0) {
      return null;
    }
    
    const servicosOrdenados = [...listaServicos].sort((a, b) => {
      return new Date(b.dataDeServico).getTime() - new Date(a.dataDeServico).getTime();
    });
    
    return servicosOrdenados[0];
  };

  const ultimoServico = getUltimoServico();
  const temPendente = ultimoServico && ultimoServico.statusServico === 'Pendente';
  // Para polígonos, usar o último ponto das coordenadas
  const ultimoPonto = positions.length > 0 ? positions[positions.length - 1] : null;

  // Criar ícone de bandeira customizado
  const createFlagIcon = () => {
    const flagIcon = L.divIcon({
      className: 'custom-flag-icon',
      html: `<div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background-color: #ef4444;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      ">
        <svg style="width: 20px; height: 20px; color: white;" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
          <path d="M14.778.085A1.5 1.5 0 0 1 16 1.5V8a1.5 1.5 0 0 1-.314 1.011L8.5 15.5l-5.186-6.489A1.5 1.5 0 0 1 3.5 8V1.5a1.5 1.5 0 0 1 1.278-1.415L8.5 0l4.778.085z"/>
        </svg>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    return flagIcon;
  };

  const lineColor = getLineColor(listaServicos, tempoRocagemPad, tempoCortePersonalizado);
  const isHighlighted = highlightedRocadaId === id;

  // Atualizar cor quando listaServicos, tempoRocagemPad ou tempoCortePersonalizado mudarem
  useEffect(() => {
    if (polygonRef.current) {
      const newColor = getLineColor(listaServicos, tempoRocagemPad, tempoCortePersonalizado);
      polygonRef.current.setStyle({
        color: newColor,
        fillColor: newColor,
      });
    }
  }, [listaServicos, tempoRocagemPad, tempoCortePersonalizado]);

  // Animação de piscar quando destacado
  useEffect(() => {
    if (!isHighlighted || !polygonRef.current) return;

    const polygon = polygonRef.current;
    const originalColor = getLineColor(listaServicos, tempoRocagemPad, tempoCortePersonalizado);
    let isBlinking = false;
    
    const blinkInterval = setInterval(() => {
      if (polygon) {
        isBlinking = !isBlinking;
        const blinkColor = isBlinking ? '#00FFFF' : originalColor; // Ciano para piscar
        polygon.setStyle({
          color: blinkColor,
          fillColor: blinkColor,
          weight: isBlinking ? 6 : 3,
        });
      }
    }, 300); // Piscar a cada 300ms

    // Limpar após 5 segundos
    const timeout = setTimeout(() => {
      clearInterval(blinkInterval);
      if (polygon) {
        polygon.setStyle({
          color: originalColor,
          fillColor: originalColor,
          weight: 3,
        });
      }
    }, 5000);

    return () => {
      clearInterval(blinkInterval);
      clearTimeout(timeout);
    };
  }, [isHighlighted, listaServicos, tempoRocagemPad, tempoCortePersonalizado, id]);

  return (
    <>
      <Polygon
        ref={(ref) => {
          if (ref) {
            polygonRef.current = (ref as any).instance || ref as L.Polygon;
          }
        }}
        positions={positions}
        color={lineColor}
        weight={3}
        opacity={0.7}
        fillColor={lineColor}
        fillOpacity={0.2}
        eventHandlers={{
          mouseover: (e) => {
            e.target.setStyle({ weight: 8 });
          },
          mouseout: (e) => {
            e.target.setStyle({ weight: 3 });
          },
          click: (e) => {
            const { latlng } = e;
            const layer = e.target;
            const popup = layer.getPopup();
            if (popup) {
              popup.setLatLng(latlng).openOn(layer._map);
            }
          },
        }}
        pathOptions={{
          interactive: true,
        }}
      >
        <Popup>
          <PopupContent
            nomeDaRua={nomeDaRua}
            perimetroRocada={perimetroRocada}
            listaServicos={listaServicos}
            rocadaId={id}
            onRocadaUpdated={onRocadaUpdated}
            tempoRocagemPad={tempoRocagemPad}
            tempoCortePersonalizado={tempoCortePersonalizado}
            onEdit={(rocadaId) => {
              map.closePopup();
              onEdit(rocadaId);
            }}
          />
        </Popup>
      </Polygon>
      {temPendente && ultimoPonto && (
        <Marker
          position={ultimoPonto}
          icon={createFlagIcon()}
        />
      )}
    </>
  );
}

function HighlightablePolyline({ 
  positions, 
  id, 
  nomeDaRua, 
  perimetroRocada, 
  listaServicos,
  onRocadaUpdated,
  tempoRocagemPad,
  tempoCortePersonalizado,
  highlightedRocadaId,
  onEdit
}: { 
  positions: [number, number][]; 
  id: string;
  nomeDaRua: string;
  perimetroRocada?: number;
  listaServicos?: Servico[];
  onRocadaUpdated: (updatedRocada: Rocada) => void;
  tempoRocagemPad: number;
  tempoCortePersonalizado?: number | null;
  highlightedRocadaId?: string | null;
  onEdit: (rocadaId: string) => void;
}) {
  const map = useMap();
  const polylineRef = useRef<L.Polyline | null>(null);
  // Verificar se o último serviço é 'Pendente'
  const getUltimoServico = () => {
    if (!listaServicos || listaServicos.length === 0) {
      return null;
    }
    
    const servicosOrdenados = [...listaServicos].sort((a, b) => {
      return new Date(b.dataDeServico).getTime() - new Date(a.dataDeServico).getTime();
    });
    
    return servicosOrdenados[0];
  };

  const ultimoServico = getUltimoServico();
  const temPendente = ultimoServico && ultimoServico.statusServico === 'Pendente';
  const ultimoPonto = positions.length > 0 ? positions[positions.length - 1] : null;

  // Criar ícone de bandeira customizado
  const createFlagIcon = () => {
    const flagIcon = L.divIcon({
      className: 'custom-flag-icon',
      html: `<div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background-color: #ef4444;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      ">
        <svg style="width: 20px; height: 20px; color: white;" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
          <path d="M14.778.085A1.5 1.5 0 0 1 16 1.5V8a1.5 1.5 0 0 1-.314 1.011L8.5 15.5l-5.186-6.489A1.5 1.5 0 0 1 3.5 8V1.5a1.5 1.5 0 0 1 1.278-1.415L8.5 0l4.778.085z"/>
        </svg>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    return flagIcon;
  };

  const lineColor = getLineColor(listaServicos, tempoRocagemPad, tempoCortePersonalizado);
  const isHighlighted = highlightedRocadaId === id;

  // Atualizar cor quando listaServicos, tempoRocagemPad ou tempoCortePersonalizado mudarem
  useEffect(() => {
    if (polylineRef.current) {
      const newColor = getLineColor(listaServicos, tempoRocagemPad, tempoCortePersonalizado);
      polylineRef.current.setStyle({
        color: newColor,
      });
    }
  }, [listaServicos, tempoRocagemPad, tempoCortePersonalizado]);

  // Animação de piscar quando destacado
  useEffect(() => {
    if (!isHighlighted || !polylineRef.current) return;

    const polyline = polylineRef.current;
    const originalColor = getLineColor(listaServicos, tempoRocagemPad, tempoCortePersonalizado);
    let isBlinking = false;
    
    const blinkInterval = setInterval(() => {
      if (polyline) {
        isBlinking = !isBlinking;
        const blinkColor = isBlinking ? '#00FFFF' : originalColor; // Ciano para piscar
        polyline.setStyle({
          color: blinkColor,
          weight: isBlinking ? 8 : 5,
        });
      }
    }, 300); // Piscar a cada 300ms

    // Limpar após 5 segundos
    const timeout = setTimeout(() => {
      clearInterval(blinkInterval);
      if (polyline) {
        polyline.setStyle({
          color: originalColor,
          weight: 5,
        });
      }
    }, 5000);

    return () => {
      clearInterval(blinkInterval);
      clearTimeout(timeout);
    };
  }, [isHighlighted, listaServicos, tempoRocagemPad, tempoCortePersonalizado, id]);

  return (
    <>
      <Polyline
        ref={(ref) => {
          if (ref) {
            polylineRef.current = (ref as any).instance || ref as L.Polyline;
          }
        }}
        positions={positions}
        color={lineColor}
        weight={5}
        opacity={0.7}
        eventHandlers={{
          mouseover: (e) => {
            e.target.setStyle({ weight: 10 });
          },
          mouseout: (e) => {
            e.target.setStyle({ weight: 5 });
          },
          click: (e) => {
            const { latlng } = e;
            const layer = e.target;
            const popup = layer.getPopup();
            if (popup) {
              popup.setLatLng(latlng).openOn(layer._map);
            }
          },
        }}
        pathOptions={{
          interactive: true,
        }}
      >
        <Popup>
          <PopupContent
            nomeDaRua={nomeDaRua}
            perimetroRocada={perimetroRocada}
            listaServicos={listaServicos}
            rocadaId={id}
            onRocadaUpdated={onRocadaUpdated}
            tempoRocagemPad={tempoRocagemPad}
            tempoCortePersonalizado={tempoCortePersonalizado}
            onEdit={(rocadaId) => {
              map.closePopup();
              onEdit(rocadaId);
            }}
          />
        </Popup>
      </Polyline>
      {temPendente && ultimoPonto && (
        <Marker
          position={ultimoPonto}
          icon={createFlagIcon()}
        />
      )}
    </>
  );
}

export default function Map() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [tilesReady, setTilesReady] = useState(false);
  const [tilesLeafletReady, setTilesLeafletReady] = useState(false);
  const [rocadas, setRocadas] = useState<Rocada[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempoRocagemPad, setTempoRocagemPad] = useState<number>(60);
  const [tempoRelPad, setTempoRelPad] = useState<number>(30);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [showBairrosMenu, setShowBairrosMenu] = useState(false);
  const bairrosMenuRef = useRef<HTMLDivElement>(null);
  const [localizadores, setLocalizadores] = useState<LocalizadorUsuario[]>([]);
  
  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bairrosMenuRef.current && !bairrosMenuRef.current.contains(event.target as Node)) {
        setShowBairrosMenu(false);
      }
      if (buscaRuaRef.current && !buscaRuaRef.current.contains(event.target as Node)) {
        setShowListaRuas(false);
      }
      if (fiscaisPanelRef.current && !fiscaisPanelRef.current.contains(event.target as Node)) {
        setShowFiscaisPanel(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  const [bairros, setBairros] = useState<Array<{ _id: string; nome: string; ruas: string[] }>>([]);
  const [bairroFiltroAtivo, setBairroFiltroAtivo] = useState<string | null>(null); // null = "Todos"
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editingRocada, setEditingRocada] = useState<Rocada | null>(null);
  const [editingRocadaId, setEditingRocadaId] = useState<string | null>(null);
  const [editingCoordinates, setEditingCoordinates] = useState<Point[]>([]);
  const [buscaRua, setBuscaRua] = useState<string>('');
  const [showListaRuas, setShowListaRuas] = useState<boolean>(false);
  const buscaRuaRef = useRef<HTMLDivElement>(null);
  const [focusRocadaId, setFocusRocadaId] = useState<string | null>(null);
  const [highlightedRocadaId, setHighlightedRocadaId] = useState<string | null>(null);
  const [tipoMapaSelecionado, setTipoMapaSelecionado] = useState<'satelite' | 'territorio'>('satelite');
  const [showCronogramaModal, setShowCronogramaModal] = useState<boolean>(false);
  const [showFiscaisPanel, setShowFiscaisPanel] = useState<boolean>(false);
  const fiscaisPanelRef = useRef<HTMLDivElement>(null);
  const [focusLocalizadorId, setFocusLocalizadorId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [showBairrosAccordion, setShowBairrosAccordion] = useState<boolean>(false);

  useEffect(() => {
    // Timestamps para controle de throttle
    let lastRocadasFetch = 0;
    let lastLocalizadoresFetch = 0;
    let visibilityDebounceTimer: NodeJS.Timeout | null = null;
    
    const fetchRocadas = async () => {
      try {
        console.log('🔄 Buscando roçadas:', new Date().toLocaleTimeString());
        const response = await fetch('/api/rocada');
        const result = await response.json();
        if (result.success) {
          setRocadas(result.data);
          lastRocadasFetch = Date.now();
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
          setTempoRelPad(result.data.tempoRelPad || 30);
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
        }
      } catch (error) {
        console.error('Erro ao carregar bairros:', error);
      }
    };

    const fetchLocalizadores = async () => {
      try {
        console.log('📍 Buscando localizadores:', new Date().toLocaleTimeString());
        const response = await fetch('/api/localizador');
        const result = await response.json();
        if (result.success) {
          setLocalizadores(result.data);
          lastLocalizadoresFetch = Date.now();
        }
      } catch (error) {
        console.error('Erro ao carregar localizadores:', error);
      }
    };

    fetchRocadas();
    fetchConfig();
    fetchBairros();
    fetchLocalizadores();

    // Atualizar localizadores a cada 1 minuto
    const localizadoresInterval = setInterval(() => {
      console.log('⏰ Interval: Buscando localizadores');
      fetchLocalizadores();
    }, 60000);

    // Sincronizar roçadas periodicamente para refletir mudanças feitas no app Expo (a cada 5 minutos)
    const rocadasInterval = setInterval(() => {
      console.log('⏰ Interval: Buscando roçadas');
      fetchRocadas();
    }, 300000);

    // Quando a aba/janela volta ao foco, busca dados atualizados (com throttle e debounce para evitar chamadas excessivas)
    const handleVisibilityOrFocus = () => {
      // Limpar timer anterior se existir
      if (visibilityDebounceTimer) {
        clearTimeout(visibilityDebounceTimer);
      }
      
      // Debounce de 100ms para evitar chamadas duplicadas de eventos simultâneos
      visibilityDebounceTimer = setTimeout(() => {
        const now = Date.now();
        const rocadasCooldown = 60000; // 1 minuto de cooldown para roçadas
        const localizadoresCooldown = 30000; // 30 segundos de cooldown para localizadores
        
        // Só busca roçadas se passou tempo suficiente desde a última busca
        if (now - lastRocadasFetch >= rocadasCooldown) {
          console.log('👁️ Visibilidade/Foco: Buscando roçadas');
          fetchRocadas();
        } else {
          console.log('⏸️ Cooldown ativo para roçadas, pulando fetch');
        }
        
        // Só busca localizadores se passou tempo suficiente desde a última busca
        if (now - lastLocalizadoresFetch >= localizadoresCooldown) {
          console.log('👁️ Visibilidade/Foco: Buscando localizadores');
          fetchLocalizadores();
        } else {
          console.log('⏸️ Cooldown ativo para localizadores, pulando fetch');
        }
      }, 100);
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(localizadoresInterval);
      clearInterval(rocadasInterval);
      if (visibilityDebounceTimer) {
        clearTimeout(visibilityDebounceTimer);
      }
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, []);

  useEffect(() => {
    if (mapReady && tilesReady && tilesLeafletReady && dataLoaded && configLoaded) {
      setLoading(false);
    }
  }, [mapReady, tilesReady, tilesLeafletReady, dataLoaded, configLoaded]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bairrosMenuRef.current && !bairrosMenuRef.current.contains(event.target as Node)) {
        setShowBairrosMenu(false);
      }
    };

    if (showBairrosMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBairrosMenu]);

  const handleMapReady = () => {
    setMapReady(true);
  };

  const handleTilesReady = () => {
    setTilesReady(true);
  };

  const handleRocadaUpdated = (updatedRocada: Rocada) => {
    setRocadas((prevRocadas) =>
      prevRocadas.map((rocada) =>
        rocada._id === updatedRocada._id ? updatedRocada : rocada
      )
    );
  };

  const handleOpenConfig = async () => {
    try {
      const response = await fetch('/api/config');
      const result = await response.json();
      if (result.success) {
        setTempoRocagemPad(result.data.tempoRocagemPad || 60);
        setTempoRelPad(result.data.tempoRelPad || 30);
        setShowConfigModal(true);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      setShowConfigModal(true);
    }
  };

  const handleSaveConfig = async () => {
    try {
      const response = await fetch('/api/config', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tempoRocagemPad: tempoRocagemPad,
          tempoRelPad: tempoRelPad,
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log('Configuração salva:', result.data);
        setShowConfigModal(false);
      } else {
        console.error('Erro ao salvar configuração:', result.error);
        alert('Erro ao salvar configuração. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      alert('Erro ao salvar configuração. Tente novamente.');
    }
  };

  // Formatar nome do fiscal (fiscal1 -> Fiscal 1)
  const formatFiscalName = (nomeUsuario: string): string => {
    const match = nomeUsuario.match(/^([a-zA-Z]+)(\d+)$/);
    if (match) {
      const prefix = match[1].charAt(0).toUpperCase() + match[1].slice(1);
      const number = match[2];
      return `${prefix} ${number}`;
    }
    return nomeUsuario;
  };

  // Formatar data e hora
  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Função para forçar atualização manual de todos os dados
  const handleForceRefresh = async () => {
    console.log('🔄 REFRESH MANUAL - Atualizando todos os dados');
    setIsRefreshing(true);
    
    try {
      // Buscar roçadas
      console.log('🔄 Refresh Manual: Buscando roçadas');
      const rocadasResponse = await fetch('/api/rocada');
      const rocadasResult = await rocadasResponse.json();
      if (rocadasResult.success) {
        setRocadas(rocadasResult.data);
      }

      // Buscar localizadores
      console.log('📍 Refresh Manual: Buscando localizadores');
      const localizadoresResponse = await fetch('/api/localizador');
      const localizadoresResult = await localizadoresResponse.json();
      if (localizadoresResult.success) {
        setLocalizadores(localizadoresResult.data);
      }

      // Buscar bairros
      console.log('🗺️ Refresh Manual: Buscando bairros');
      const bairrosResponse = await fetch('/api/bairros');
      const bairrosResult = await bairrosResponse.json();
      if (bairrosResult.success) {
        setBairros(bairrosResult.data);
      }
      
      console.log('✅ Refresh Manual: Dados atualizados com sucesso');
    } catch (error) {
      console.error('❌ Erro ao atualizar dados:', error);
    } finally {
      // Delay mínimo para mostrar animação de loading
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  const handleEditRocada = async (rocadaId: string) => {
    try {
      const response = await fetch(`/api/rocada/${rocadaId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      if (!text) {
        throw new Error('Resposta vazia do servidor');
      }
      
      const result = JSON.parse(text);
      
      if (result.success) {
        setEditingRocada(result.data);
        setEditingRocadaId(rocadaId);
        setEditingCoordinates([...result.data.coordenadasRua]);
        setShowEditPanel(true);
      } else {
        console.error('Erro ao carregar roçada:', result.error);
        alert('Erro ao carregar dados para edição.');
      }
    } catch (error) {
      console.error('Erro ao carregar roçada:', error);
      alert('Erro ao carregar dados para edição. Tente novamente.');
    }
  };

  const handleSaveRocada = async (updatedData: Partial<Rocada>) => {
    if (!editingRocada) return;
    
    try {
      // Incluir coordenadas atualizadas se houver
      const dataToSave = {
        ...updatedData,
        coordenadasRua: editingCoordinates.length > 0 ? editingCoordinates : updatedData.coordenadasRua,
      };

      const response = await fetch(`/api/rocada/${editingRocada._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });

      const result = await response.json();
      if (result.success) {
        // Atualizar a lista local
        setRocadas((prevRocadas) =>
          prevRocadas.map((rocada) =>
            rocada._id === editingRocada._id ? result.data : rocada
          )
        );
        setShowEditPanel(false);
        setEditingRocada(null);
        setEditingRocadaId(null);
        setEditingCoordinates([]);
      } else {
        console.error('Erro ao salvar roçada:', result.error);
        alert('Erro ao salvar alterações. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao salvar roçada:', error);
      alert('Erro ao salvar alterações. Tente novamente.');
    }
  };

  const handleMarkerDragEnd = (index: number, newPosition: Point) => {
    setEditingCoordinates((prev) => {
      const updated = [...prev];
      updated[index] = newPosition;
      return updated;
    });
  };

  const handleMarkerRemove = (index: number) => {
    if (editingCoordinates.length <= 2) {
      alert('Uma linha precisa ter pelo menos 2 pontos.');
      return;
    }
    setEditingCoordinates((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleMapClickEdit = (point: Point) => {
    // Adicionar o novo ponto ao final das coordenadas
    setEditingCoordinates((prev) => [...prev, point]);
  };

  const isPolygon = (points: Point[]): boolean => {
    if (points.length < 3) return false;
    const first = points[0];
    const last = points[points.length - 1];
    return first.lat === last.lat && first.lng === last.lng;
  };

  return (
    <div className="relative h-screen w-full">
      {loading && (
        <div className="absolute inset-0 z-[3000]">
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
            <div className="hidden lg:flex items-center gap-3">
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
                RM Manager
              </h1>
            </div>

            {/* Navegação */}
            <nav className="flex items-center gap-2 sm:gap-3 flex-1 justify-end">
              {/* Input de busca de ruas - SEMPRE VISÍVEL */}
              <div className="relative flex-1 sm:flex-initial" ref={buscaRuaRef}>
                <input
                  type="text"
                  value={buscaRua}
                  onChange={(e) => {
                    setBuscaRua(e.target.value);
                    setShowListaRuas(true);
                  }}
                  onFocus={() => setShowListaRuas(true)}
                  placeholder="Buscar rua..."
                  className="px-3 sm:px-4 py-2 sm:py-2.5 w-full sm:w-48 md:w-56 lg:w-64 bg-slate-800/50 border-2 border-slate-600 text-slate-200 placeholder-slate-500 rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200 text-sm sm:text-base"
                />
                {showListaRuas && (
                  <div className="absolute top-full left-0 right-0 sm:left-0 sm:right-auto mt-2 sm:w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
                    {rocadas
                      .filter((rocada) => {
                        if (!buscaRua.trim()) return true;
                        return rocada.nomeDaRua.toLowerCase().includes(buscaRua.toLowerCase());
                      })
                      .slice(0, 20) // Limitar a 20 resultados
                      .map((rocada) => (
                        <button
                          key={rocada._id}
                          className="w-full px-4 py-3 text-left text-slate-300 hover:bg-slate-700 hover:text-white transition-colors duration-200 border-b border-slate-700/50 last:border-b-0"
                          onClick={() => {
                            setBuscaRua(rocada.nomeDaRua);
                            setShowListaRuas(false);
                            setFocusRocadaId(rocada._id);
                            setHighlightedRocadaId(rocada._id);
                            // Remover o destaque após 5 segundos
                            setTimeout(() => {
                              setHighlightedRocadaId(null);
                            }, 5000);
                          }}
                        >
                          <div className="font-medium">{rocada.nomeDaRua}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {rocada.tipo === 'area' ? 'Área' : 'Rua'}
                          </div>
                        </button>
                      ))}
                    {rocadas.filter((rocada) => {
                      if (!buscaRua.trim()) return true;
                      return rocada.nomeDaRua.toLowerCase().includes(buscaRua.toLowerCase());
                    }).length === 0 && (
                      <div className="px-4 py-3 text-slate-500 text-center">
                        Nenhuma rua encontrada
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Botões - Visíveis apenas em telas grandes */}
              <div className="hidden 2xl:flex items-center gap-3">
                <button
                  className="px-5 py-2.5 border-2 border-blue-500 text-blue-400 font-medium rounded-lg bg-transparent hover:border-blue-400 hover:text-blue-300 active:scale-95 transition-all duration-200 ease-out hover:shadow-lg hover:shadow-blue-500/50"
                  onClick={() => router.push('/adc-rua')}
                >
                  Adicionar Rua
                </button>
                <button
                  className="px-5 py-2.5 border-2 border-purple-500 text-purple-400 font-medium rounded-lg bg-transparent hover:border-purple-400 hover:text-purple-300 active:scale-95 transition-all duration-200 ease-out hover:shadow-lg hover:shadow-purple-500/50"
                  onClick={() => router.push('/adc-area')}
                >
                  Adicionar Área
                </button>
                <div className="relative" ref={bairrosMenuRef}>
                  <button
                    className="px-5 py-2.5 border-2 border-pink-500 text-pink-400 font-medium rounded-lg bg-transparent hover:border-pink-400 hover:text-pink-300 active:scale-95 transition-all duration-200 ease-out hover:shadow-lg hover:shadow-pink-500/50"
                    onClick={() => setShowBairrosMenu(!showBairrosMenu)}
                  >
                    Bairros
                  </button>
                  {showBairrosMenu && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
                      <button
                        className="w-full px-4 py-3 text-left text-slate-300 hover:bg-slate-700 hover:text-white transition-colors duration-200"
                        onClick={() => {
                          router.push('/gerenciado-bairro');
                          setShowBairrosMenu(false);
                        }}
                      >
                        Gerenciar Bairros
                      </button>
                      <div className="border-t border-slate-700"></div>
                      <button
                        className={`w-full px-4 py-3 text-left transition-colors duration-200 ${
                          bairroFiltroAtivo === null
                            ? 'bg-blue-600/30 text-blue-400 font-semibold'
                            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                        onClick={() => {
                          setBairroFiltroAtivo(null);
                          setShowBairrosMenu(false);
                        }}
                      >
                        Todos
                      </button>
                      {bairros.map((bairro) => (
                        <button
                          key={bairro._id}
                          className={`w-full px-4 py-3 text-left transition-colors duration-200 ${
                            bairroFiltroAtivo === bairro._id
                              ? 'bg-blue-600/30 text-blue-400 font-semibold'
                              : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                          }`}
                          onClick={() => {
                            setBairroFiltroAtivo(bairro._id);
                            setShowBairrosMenu(false);
                          }}
                        >
                          {bairro.nome}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  className="px-5 py-2.5 border-2 border-cyan-500 text-cyan-400 font-medium rounded-lg bg-transparent hover:border-cyan-400 hover:text-cyan-300 active:scale-95 transition-all duration-200 ease-out hover:shadow-lg hover:shadow-cyan-500/50"
                  onClick={() => router.push('/relatorios')}
                >
                  Relatórios
                </button>
                <button
                  className="px-5 py-2.5 border-2 border-yellow-500 text-yellow-400 font-medium rounded-lg bg-transparent hover:border-yellow-400 hover:text-yellow-300 active:scale-95 transition-all duration-200 ease-out hover:shadow-lg hover:shadow-yellow-500/50"
                  onClick={() => setShowCronogramaModal(true)}
                >
                  Cronograma
                </button>
                <button
                  className="px-5 py-2.5 border-2 border-slate-500 text-slate-400 font-medium rounded-lg bg-transparent hover:border-slate-400 hover:text-slate-300 active:scale-95 transition-all duration-200 ease-out hover:shadow-lg"
                  onClick={handleOpenConfig}
                >
                  <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Configuração
                </button>
              </div>

              {/* Botões de Ícone - Sempre Visíveis */}
              <button
                className={`p-2 sm:p-2.5 border-2 border-green-500 text-green-400 font-medium rounded-lg bg-transparent hover:border-green-400 hover:text-green-300 active:scale-95 transition-all duration-200 ease-out hover:shadow-lg hover:shadow-green-500/50 ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
                onClick={handleForceRefresh}
                disabled={isRefreshing}
                title="Atualizar dados"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <div className="relative" ref={fiscaisPanelRef}>
                <button
                  className="p-2 sm:p-2.5 border-2 border-orange-500 text-orange-400 font-medium rounded-lg bg-transparent hover:border-orange-400 hover:text-orange-300 active:scale-95 transition-all duration-200 ease-out hover:shadow-lg hover:shadow-orange-500/50"
                  onClick={() => setShowFiscaisPanel(!showFiscaisPanel)}
                >
                  <GrUserWorker className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                {showFiscaisPanel && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
                    {localizadores.length === 0 ? (
                      <div className="px-4 py-3 text-slate-500 text-center">
                        Nenhum fiscal encontrado
                      </div>
                    ) : (
                      localizadores.map((localizador) => {
                        const coordenadasOrdenadas = [...localizador.listaCoordenadas].sort(
                          (a, b) => new Date(b.dataHorario).getTime() - new Date(a.dataHorario).getTime()
                        );
                        const ultimaCoordenada = coordenadasOrdenadas[0];
                        
                        return (
                          <div
                            key={localizador._id}
                            className="px-4 py-3 border-b border-slate-700/50 last:border-b-0"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-slate-200 mb-1">
                                  {formatFiscalName(localizador.nomeUsuario)}
                                </div>
                                {ultimaCoordenada && (
                                  <div className="text-xs text-slate-400 mb-2">
                                    <span className="font-medium">Última localização:</span>
                                    <br />
                                    {formatDateTime(ultimaCoordenada.dataHorario)}
                                  </div>
                                )}
                              </div>
                              {ultimaCoordenada && (
                                <button
                                  className="px-3 py-1.5 bg-orange-500/20 border border-orange-500 text-orange-400 text-xs font-medium rounded hover:bg-orange-500/30 hover:text-orange-300 transition-all duration-200"
                                  onClick={() => {
                                    setFocusLocalizadorId(localizador._id);
                                    setShowFiscaisPanel(false);
                                  }}
                                >
                                  Localizar Fiscal
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Menu Hambúrguer - Visível em telas menores */}
              <div className="relative 2xl:hidden" ref={mobileMenuRef}>
                <button
                  className="p-2 sm:p-2.5 border-2 border-slate-500 text-slate-400 font-medium rounded-lg bg-transparent hover:border-slate-400 hover:text-slate-300 active:scale-95 transition-all duration-200"
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  title="Menu"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                {showMobileMenu && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
                    <button
                      className="w-full px-4 py-3 text-left text-blue-400 hover:bg-slate-700 hover:text-blue-300 transition-colors duration-200 border-b border-slate-700/50 font-medium"
                      onClick={() => {
                        router.push('/adc-rua');
                        setShowMobileMenu(false);
                      }}
                    >
                      Adicionar Rua
                    </button>
                    <button
                      className="w-full px-4 py-3 text-left text-purple-400 hover:bg-slate-700 hover:text-purple-300 transition-colors duration-200 border-b border-slate-700/50 font-medium"
                      onClick={() => {
                        router.push('/adc-area');
                        setShowMobileMenu(false);
                      }}
                    >
                      Adicionar Área
                    </button>
                    <button
                      className="w-full px-4 py-3 text-left text-pink-400 hover:bg-slate-700 hover:text-pink-300 transition-colors duration-200 border-b border-slate-700/50 font-medium"
                      onClick={() => {
                        router.push('/gerenciado-bairro');
                        setShowMobileMenu(false);
                      }}
                    >
                      Gerenciar Bairros
                    </button>
                    <div className="border-t border-slate-700"></div>
                    
                    {/* Acordeon de Bairros */}
                    <button
                      className="w-full px-4 py-3 text-left text-slate-300 hover:bg-slate-700 hover:text-white transition-colors duration-200 border-b border-slate-700/50 font-medium flex items-center justify-between"
                      onClick={() => setShowBairrosAccordion(!showBairrosAccordion)}
                    >
                      <span>Filtrar por Bairro</span>
                      <svg
                        className={`w-5 h-5 transition-transform duration-200 ${
                          showBairrosAccordion ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Lista de Bairros (Expansível) */}
                    {showBairrosAccordion && (
                      <div className="bg-slate-900/50">
                        <button
                          className={`w-full px-6 py-2.5 text-left text-sm transition-colors duration-200 border-b border-slate-700/50 ${
                            bairroFiltroAtivo === null
                              ? 'bg-blue-600/30 text-blue-400 font-semibold'
                              : 'text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                          }`}
                          onClick={() => {
                            setBairroFiltroAtivo(null);
                            setShowMobileMenu(false);
                            setShowBairrosAccordion(false);
                          }}
                        >
                          ✓ Todos os Bairros
                        </button>
                        {bairros.map((bairro) => (
                          <button
                            key={bairro._id}
                            className={`w-full px-6 py-2.5 text-left text-sm transition-colors duration-200 border-b border-slate-700/50 ${
                              bairroFiltroAtivo === bairro._id
                                ? 'bg-blue-600/30 text-blue-400 font-semibold'
                                : 'text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                            }`}
                            onClick={() => {
                              setBairroFiltroAtivo(bairro._id);
                              setShowMobileMenu(false);
                              setShowBairrosAccordion(false);
                            }}
                          >
                            {bairroFiltroAtivo === bairro._id ? '✓ ' : ''}{bairro.nome}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="border-t border-slate-700"></div>
                    <button
                      className="w-full px-4 py-3 text-left text-cyan-400 hover:bg-slate-700 hover:text-cyan-300 transition-colors duration-200 border-b border-slate-700/50 font-medium"
                      onClick={() => {
                        router.push('/relatorios');
                        setShowMobileMenu(false);
                      }}
                    >
                      Relatórios
                    </button>
                    <button
                      className="w-full px-4 py-3 text-left text-yellow-400 hover:bg-slate-700 hover:text-yellow-300 transition-colors duration-200 border-b border-slate-700/50 font-medium"
                      onClick={() => {
                        setShowCronogramaModal(true);
                        setShowMobileMenu(false);
                      }}
                    >
                      Cronograma
                    </button>
                    <button
                      className="w-full px-4 py-3 text-left text-slate-400 hover:bg-slate-700 hover:text-slate-300 transition-colors duration-200 font-medium"
                      onClick={() => {
                        handleOpenConfig();
                        setShowMobileMenu(false);
                      }}
                    >
                      Configuração
                    </button>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Botões de tipo de mapa - fixados no topo esquerdo */}
      <div className="fixed top-[73px] left-6 z-[1000] flex flex-col gap-3">
        <button
          onClick={() => setTipoMapaSelecionado('satelite')}
          className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all duration-200 shadow-lg ${
            tipoMapaSelecionado === 'satelite'
              ? 'border-cyan-400 ring-2 ring-cyan-400/50 scale-105'
              : 'border-slate-600 hover:border-slate-500'
          }`}
        >
          <img
            src="/satelite.jpg"
            alt="Satélite"
            className="w-full h-full object-cover"
          />
        </button>
        <button
          onClick={() => setTipoMapaSelecionado('territorio')}
          className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all duration-200 shadow-lg ${
            tipoMapaSelecionado === 'territorio'
              ? 'border-cyan-400 ring-2 ring-cyan-400/50 scale-105'
              : 'border-slate-600 hover:border-slate-500'
          }`}
        >
          <img
            src="/territorio.jpg"
            alt="Território"
            className="w-full h-full object-cover"
          />
        </button>
      </div>

      <div className="pt-[73px] h-screen w-full">
        <MapContainer
          center={[-25.82020123877223, -48.53679568468259]}
          zoom={13}
          maxZoom={30}
          style={{ height: 'calc(100vh - 73px)', width: '100%' }}
        >
        <MapReadyHandler onMapReady={handleMapReady} />
        <MapController 
          focusRocadaId={focusRocadaId} 
          rocadas={rocadas}
          onFocusComplete={() => setFocusRocadaId(null)}
        />
        <LocalizadorController
          focusLocalizadorId={focusLocalizadorId}
          localizadores={localizadores}
          onFocusComplete={() => setFocusLocalizadorId(null)}
        />
        {/* Layer do Google Maps (Satélite) */}
        <TileLayer
          attribution='&copy; Google Maps'
          url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          maxZoom={30}
          maxNativeZoom={20}
          opacity={tipoMapaSelecionado === 'satelite' ? 1 : 0}
          zIndex={tipoMapaSelecionado === 'satelite' ? 1 : 0}
        />
        <TileLayerReady onTilesReady={handleTilesReady} />
        {/* Layer base do Leaflet (OpenStreetMap) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          opacity={tipoMapaSelecionado === 'territorio' ? 1 : 0}
          zIndex={tipoMapaSelecionado === 'territorio' ? 1 : 0}
        />
        <TileLayerLeafletReady onTilesReady={() => setTilesLeafletReady(true)} />
        {editingRocadaId && (
          <MapClickHandlerEdit 
            onMapClick={handleMapClickEdit}
            enabled={!!editingRocadaId}
          />
        )}
        {rocadas
          .filter((rocada) => {
            // Se não há filtro ativo (null = "Todos"), mostra todas
            if (bairroFiltroAtivo === null) {
              return true;
            }
            // Caso contrário, mostra apenas ruas do bairro selecionado
            const bairroSelecionado = bairros.find((b) => b._id === bairroFiltroAtivo);
            return bairroSelecionado?.ruas.includes(rocada._id) || false;
          })
          .map((rocada) => {
          const positions = rocada.coordenadasRua.map((p) => [p.lat, p.lng] as [number, number]);
          const isPoly = rocada.tipo === 'area' || isPolygon(rocada.coordenadasRua);
          
          if (isPoly && positions.length >= 3) {
            return (
              <HighlightablePolygon
                key={rocada._id}
                id={rocada._id}
                positions={[...positions, positions[0]]}
                nomeDaRua={rocada.nomeDaRua}
                perimetroRocada={rocada.perimetroRocada || 0}
                listaServicos={rocada.listaServicos || []}
                onRocadaUpdated={handleRocadaUpdated}
                tempoRocagemPad={tempoRocagemPad}
                tempoCortePersonalizado={rocada.tempoCortePersonalizado}
                highlightedRocadaId={highlightedRocadaId}
                onEdit={handleEditRocada}
              />
            );
          } else if (positions.length >= 2) {
            return (
              <HighlightablePolyline
                key={rocada._id}
                id={rocada._id}
                positions={positions}
                nomeDaRua={rocada.nomeDaRua}
                perimetroRocada={rocada.perimetroRocada || 0}
                listaServicos={rocada.listaServicos || []}
                onRocadaUpdated={handleRocadaUpdated}
                tempoRocagemPad={tempoRocagemPad}
                tempoCortePersonalizado={rocada.tempoCortePersonalizado}
                highlightedRocadaId={highlightedRocadaId}
                onEdit={handleEditRocada}
              />
            );
          }
          return null;
        })}
        
        {/* Marcadores de localização dos usuários */}
        {localizadores.map((localizador) => (
          <UserLocationMarkers key={localizador._id} localizador={localizador} />
        ))}
        
        {/* Linha de edição com animação e marcadores arrastáveis */}
        {editingRocadaId && editingCoordinates.length > 0 && (
          <>
            <AnimatedEditingPolyline positions={editingCoordinates.map((p) => [p.lat, p.lng] as [number, number])} />
            {editingCoordinates.map((point, index) => (
              <DraggableMarker
                key={`edit-${index}`}
                point={point}
                index={index}
                onDragEnd={handleMarkerDragEnd}
                onRemove={handleMarkerRemove}
              />
            ))}
          </>
        )}
        </MapContainer>
      </div>

      {showConfigModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-semibold text-slate-900 mb-6">
              Configurações
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tempo Padrão para Manutenção de Roçagens (dias)
                </label>
                <input
                  type="number"
                  value={tempoRocagemPad}
                  onChange={(e) => setTempoRocagemPad(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  min="0"
                  step="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tempo Padrão para Relatórios (dias)
                </label>
                <input
                  type="number"
                  value={tempoRelPad}
                  onChange={(e) => setTempoRelPad(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  min="0"
                  step="1"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfigModal(false)}
                className="flex-1 px-6 py-3 bg-slate-200 text-slate-900 font-medium rounded-lg shadow-lg hover:bg-slate-300 active:scale-95 transition-all duration-200 ease-out"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveConfig}
                className="flex-1 px-6 py-3 bg-slate-900 text-white font-medium rounded-lg shadow-lg hover:bg-slate-800 active:scale-95 transition-all duration-200 ease-out"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Painel de Edição Lateral */}
      {showEditPanel && editingRocada && (
        <EditPanel
          rocada={editingRocada}
          editingCoordinates={editingCoordinates}
          onClose={() => {
            setShowEditPanel(false);
            setEditingRocada(null);
            setEditingRocadaId(null);
            setEditingCoordinates([]);
          }}
          onSave={handleSaveRocada}
          onRocadaUpdated={(updatedRocada) => {
            if (updatedRocada === null) {
              // Se for null, significa que foi removido
              setRocadas((prevRocadas) =>
                prevRocadas.filter((rocada) => rocada._id !== editingRocada._id)
              );
              setShowEditPanel(false);
              setEditingRocada(null);
              setEditingRocadaId(null);
              setEditingCoordinates([]);
            } else {
              setEditingRocada(updatedRocada);
              setRocadas((prevRocadas) =>
                prevRocadas.map((rocada) =>
                  rocada._id === updatedRocada._id ? updatedRocada : rocada
                )
              );
            }
          }}
        />
      )}
      
      {/* Modal do Cronograma */}
      {showCronogramaModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-xl shadow-2xl w-[95vw] max-w-7xl h-[90vh] max-h-[90vh] flex flex-col overflow-hidden border border-slate-700">
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 bg-clip-text text-transparent">
                Cronograma de Necessidade de Corte
              </h2>
              <button
                onClick={() => setShowCronogramaModal(false)}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Conteúdo do Modal - Tabela de Necessidade */}
            <div className="flex-1 overflow-y-auto p-6">
              <TabelaNecessidade 
                rocadas={rocadas} 
                bairros={bairros} 
                tempoRocagemPad={tempoRocagemPad} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Função para calcular distância entre dois pontos em metros (fórmula de Haversine)
function calculateDistance(point1: Point, point2: Point): number {
  const R = 6371000; // Raio da Terra em metros
  const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const dLon = ((point2.lng - point1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1.lat * Math.PI) / 180) *
      Math.cos((point2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Componente do Painel de Edição
function EditPanel({
  rocada,
  editingCoordinates,
  onClose,
  onSave,
  onRocadaUpdated
}: {
  rocada: Rocada;
  editingCoordinates: Point[];
  onClose: () => void;
  onSave: (data: Partial<Rocada>) => void;
  onRocadaUpdated?: (rocada: Rocada) => void;
}) {
  const [nomeDaRua, setNomeDaRua] = useState(rocada.nomeDaRua);
  const [dataCadastro, setDataCadastro] = useState(rocada.dataCadastro);
  const [comprimento, setComprimento] = useState(rocada.comprimento || 0);
  const [perimetroRocada, setPerimetroRocada] = useState(rocada.perimetroRocada || 0);
  const [notasSobreRua, setNotasSobreRua] = useState(rocada.notasSobreRua || '');
  const [tempoCortePersonalizado, setTempoCortePersonalizado] = useState<number | null>(rocada.tempoCortePersonalizado ?? null);
  const [tempoCorteAtivado, setTempoCorteAtivado] = useState(rocada.tempoCortePersonalizado !== null);
  const [showEditServicoModal, setShowEditServicoModal] = useState(false);
  const [servicoEditando, setServicoEditando] = useState<Servico | null>(null);
  const [servicoEditandoIndex, setServicoEditandoIndex] = useState<number>(-1);
  const [localRocada, setLocalRocada] = useState(rocada);

  // Atualizar rocada local quando a prop mudar
  useEffect(() => {
    setLocalRocada(rocada);
  }, [rocada]);

  const handleRecalculate = () => {
    if (editingCoordinates.length < 2) {
      alert('É necessário ter pelo menos 2 pontos para calcular o comprimento.');
      return;
    }

    // Calcular o comprimento total da linha
    let totalDistance = 0;
    for (let i = 0; i < editingCoordinates.length - 1; i++) {
      totalDistance += calculateDistance(editingCoordinates[i], editingCoordinates[i + 1]);
    }

    const newComprimento = parseFloat(totalDistance.toFixed(2));
    const newPerimetroRocada = parseFloat((newComprimento * 2).toFixed(2));

    setComprimento(newComprimento);
    setPerimetroRocada(newPerimetroRocada);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      nomeDaRua,
      dataCadastro,
      comprimento,
      perimetroRocada,
      notasSobreRua,
      tempoCortePersonalizado: tempoCorteAtivado ? tempoCortePersonalizado : null,
    });
  };

  return (
    <>
      {/* Overlay - sem pointer-events para não bloquear o mapa */}
      <div
        className="fixed inset-0 bg-black/20 z-[2500] transition-opacity duration-300 pointer-events-none"
      />
      
      {/* Painel Lateral */}
      <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl z-[2501] transform transition-transform duration-300 ease-out overflow-y-auto border-l border-slate-700 pointer-events-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 p-6 border-b border-slate-700 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Editar {rocada.tipo === 'rua' ? 'Rua' : 'Área'}
              </h2>
              <p className="text-sm text-slate-400 mt-1">{rocada.nomeDaRua}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!confirm(`Tem certeza que deseja remover esta ${rocada.tipo === 'rua' ? 'rua' : 'área'}? Esta ação não pode ser desfeita.`)) {
                    return;
                  }

                  try {
                    const response = await fetch(`/api/rocada/${rocada._id}`, {
                      method: 'DELETE',
                    });

                    const result = await response.json();
                    if (result.success) {
                      // Remover da lista local
                      if (onRocadaUpdated) {
                        // Passar null para indicar que foi removido
                        onRocadaUpdated(null as any);
                      } else {
                        onClose();
                      }
                    } else {
                      console.error('Erro ao remover roçada:', result.error);
                      alert('Erro ao remover. Tente novamente.');
                    }
                  } catch (error) {
                    console.error('Erro ao remover roçada:', error);
                    alert('Erro ao remover. Tente novamente.');
                  }
                }}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200 active:scale-95"
                title={`Remover ${rocada.tipo === 'rua' ? 'rua' : 'área'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome da Rua */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Nome da {rocada.tipo === 'rua' ? 'Rua' : 'Área'}
            </label>
            <input
              type="text"
              value={nomeDaRua}
              onChange={(e) => setNomeDaRua(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              required
            />
          </div>

          {/* Data de Cadastro */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Data de Cadastro
            </label>
            <input
              type="datetime-local"
              value={dataCadastro}
              onChange={(e) => setDataCadastro(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
              required
            />
          </div>

          {/* Comprimento */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Comprimento {rocada.tipo === 'area' && '(Perímetro)'} (metros)
              </label>
              <button
                type="button"
                onClick={handleRecalculate}
                className="px-3 py-1.5 text-xs font-medium border-2 border-blue-500 text-blue-400 rounded-lg bg-transparent hover:border-blue-400 hover:text-blue-300 active:scale-95 transition-all duration-200 ease-out hover:shadow-lg hover:shadow-blue-500/50"
              >
                Recalcular
              </button>
            </div>
            <input
              type="number"
              step="0.01"
              value={comprimento}
              onChange={(e) => setComprimento(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all"
              required
            />
          </div>

          {/* Perímetro/Área de Roçada */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              {rocada.tipo === 'area' ? 'Área' : 'Perímetro'} de Roçada (m²)
            </label>
            <input
              type="number"
              step="0.01"
              value={perimetroRocada}
              onChange={(e) => setPerimetroRocada(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all"
              required
            />
          </div>

          {/* Tempo de Corte Personalizado */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Tempo de Corte Personalizado
              </label>
              <button
                type="button"
                onClick={() => {
                  setTempoCorteAtivado(!tempoCorteAtivado);
                  if (tempoCorteAtivado) {
                    setTempoCortePersonalizado(null);
                  }
                }}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  tempoCorteAtivado
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : 'bg-slate-700 text-slate-400 border border-slate-600'
                }`}
              >
                {tempoCorteAtivado ? 'Ativado' : 'Desativado'}
              </button>
            </div>
            {tempoCorteAtivado && (
              <input
                type="number"
                value={tempoCortePersonalizado || ''}
                onChange={(e) => setTempoCortePersonalizado(parseInt(e.target.value) || null)}
                placeholder="Dias"
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all"
              />
            )}
          </div>

          {/* Notas sobre a Rua */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Notas sobre a {rocada.tipo === 'rua' ? 'Rua' : 'Área'}
            </label>
            <textarea
              value={notasSobreRua}
              onChange={(e) => setNotasSobreRua(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none"
              placeholder="Digite notas sobre esta rua/área..."
            />
          </div>

          {/* Lista de Serviços */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Serviços Realizados
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {localRocada.listaServicos && localRocada.listaServicos.length > 0 ? (
                [...localRocada.listaServicos]
                  .sort((a, b) => new Date(b.dataDeServico).getTime() - new Date(a.dataDeServico).getTime())
                  .map((servico, index) => {
                    const dataServico = new Date(servico.dataDeServico);
                    const dataFormatada = dataServico.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const originalIndex = localRocada.listaServicos!.indexOf(servico);
                    
                    const getStatusColor = (status: string) => {
                      if (status === 'Concluído') return 'bg-green-500/20 text-green-400 border-green-500/30';
                      if (status === 'Pendente') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
                      return 'bg-red-500/20 text-red-400 border-red-500/30';
                    };

                    return (
                      <button
                        key={originalIndex}
                        type="button"
                        onClick={() => {
                          setServicoEditando({ ...servico });
                          setServicoEditandoIndex(originalIndex);
                          setShowEditServicoModal(true);
                        }}
                        className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800 hover:border-slate-600 transition-all text-left group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-200 mb-1">
                              {dataFormatada}
                            </div>
                            <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(servico.statusServico)}`}>
                              {servico.statusServico}
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    );
                  })
              ) : (
                <div className="p-3 bg-slate-800/30 border border-slate-700/50 rounded-lg text-sm text-slate-500 text-center">
                  Nenhum serviço registrado
                </div>
              )}
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border-2 border-slate-600 text-slate-400 font-medium rounded-lg bg-transparent hover:border-slate-500 hover:text-slate-300 active:scale-95 transition-all duration-200 ease-out"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 border-2 border-blue-500 text-blue-400 font-medium rounded-lg bg-transparent hover:border-blue-400 hover:text-blue-300 active:scale-95 transition-all duration-200 ease-out hover:shadow-lg hover:shadow-blue-500/50"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Edição de Serviço */}
      {showEditServicoModal && servicoEditando && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowEditServicoModal(false)}
          />
          
          {/* Modal */}
          <div className="relative z-10 w-full max-w-md bg-slate-900 rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 p-5 border-b border-slate-700">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10"></div>
              <div className="relative z-10 flex items-center justify-between">
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                  Editar Serviço
                </h3>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm('Tem certeza que deseja remover este serviço?')) {
                      return;
                    }

                    if (servicoEditandoIndex === -1) return;

                    const listaServicosAtualizada = [...(localRocada.listaServicos || [])];
                    listaServicosAtualizada.splice(servicoEditandoIndex, 1);

                    try {
                      const response = await fetch(`/api/rocada/${localRocada._id}`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ listaServicos: listaServicosAtualizada }),
                      });

                      const result = await response.json();
                      if (result.success) {
                        const rocadaAtualizada = result.data;
                        if (onRocadaUpdated) {
                          onRocadaUpdated(rocadaAtualizada);
                        }
                        setShowEditServicoModal(false);
                        setServicoEditando(null);
                        setServicoEditandoIndex(-1);
                      } else {
                        console.error('Erro ao remover serviço:', result.error);
                        alert('Erro ao remover serviço. Tente novamente.');
                      }
                    } catch (error) {
                      console.error('Erro ao remover serviço:', error);
                      alert('Erro ao remover serviço. Tente novamente.');
                    }
                  }}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200 active:scale-95"
                  title="Remover serviço"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!servicoEditando || servicoEditandoIndex === -1) return;

                const listaServicosAtualizada = [...(localRocada.listaServicos || [])];
                listaServicosAtualizada[servicoEditandoIndex] = servicoEditando;

                try {
                  const response = await fetch(`/api/rocada/${localRocada._id}`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ listaServicos: listaServicosAtualizada }),
                  });

                  const result = await response.json();
                  if (result.success) {
                    // Atualizar o rocada local
                    const rocadaAtualizada = result.data;
                    if (onRocadaUpdated) {
                      onRocadaUpdated(rocadaAtualizada);
                    }
                    setShowEditServicoModal(false);
                    setServicoEditando(null);
                    setServicoEditandoIndex(-1);
                  } else {
                    console.error('Erro ao atualizar serviço:', result.error);
                    alert('Erro ao salvar alterações. Tente novamente.');
                  }
                } catch (error) {
                  console.error('Erro ao atualizar serviço:', error);
                  alert('Erro ao salvar alterações. Tente novamente.');
                }
              }}
              className="p-6 space-y-5"
            >
              {/* Data do Serviço */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Data do Serviço
                </label>
                <input
                  type="datetime-local"
                  value={servicoEditando.dataDeServico}
                  onChange={(e) => setServicoEditando({ ...servicoEditando, dataDeServico: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                  required
                />
              </div>

              {/* Status do Serviço */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Status
                </label>
                <select
                  value={servicoEditando.statusServico}
                  onChange={(e) => {
                    const novoStatus = e.target.value as 'Concluído' | 'Pendente' | 'Não Feito';
                    const dataServico = new Date(servicoEditando.dataDeServico);
                    const dia = String(dataServico.getDate()).padStart(2, '0');
                    const mes = String(dataServico.getMonth() + 1).padStart(2, '0');
                    const ano = dataServico.getFullYear();
                    const hora = String(dataServico.getHours()).padStart(2, '0');
                    const minuto = String(dataServico.getMinutes()).padStart(2, '0');
                    
                    let notasPreenchidas = '';
                    if (novoStatus === 'Concluído') {
                      notasPreenchidas = `Serviço Concluído dia ${dia}/${mes}/${ano} às ${hora}:${minuto}`;
                    } else if (novoStatus === 'Pendente') {
                      notasPreenchidas = `Serviço Pendente dia ${dia}/${mes}/${ano} às ${hora}:${minuto}`;
                    } else {
                      notasPreenchidas = `Serviço Não Feito dia ${dia}/${mes}/${ano} às ${hora}:${minuto}`;
                    }

                    setServicoEditando({
                      ...servicoEditando,
                      statusServico: novoStatus,
                      notasServico: notasPreenchidas,
                    });
                  }}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                >
                  <option value="Concluído">Concluído</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Não Feito">Não Feito</option>
                </select>
              </div>

              {/* Notas do Serviço */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Notas do Serviço
                </label>
                <textarea
                  value={servicoEditando.notasServico}
                  onChange={(e) => setServicoEditando({ ...servicoEditando, notasServico: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all resize-none"
                  placeholder="Digite notas sobre este serviço..."
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditServicoModal(false);
                    setServicoEditando(null);
                    setServicoEditandoIndex(-1);
                  }}
                  className="flex-1 px-4 py-2.5 border-2 border-slate-600 text-slate-400 font-medium rounded-lg bg-transparent hover:border-slate-500 hover:text-slate-300 active:scale-95 transition-all duration-200 ease-out"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 border-2 border-purple-500 text-purple-400 font-medium rounded-lg bg-transparent hover:border-purple-400 hover:text-purple-300 active:scale-95 transition-all duration-200 ease-out hover:shadow-lg hover:shadow-purple-500/50"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
