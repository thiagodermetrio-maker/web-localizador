'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MapContainer, TileLayer, Marker, Polygon, Polyline, useMapEvents, useMap } from 'react-leaflet';
import { Marker as LeafletMarker } from 'leaflet';
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

function MapClickHandler({ onMapClick }: { onMapClick: (point: Point) => void }) {
  useMapEvents({
    click: (e) => {
      // Não adicionar ponto se clicou em uma feature interativa
      const target = e.originalEvent.target as HTMLElement;
      if (target && (target.classList.contains('leaflet-interactive') || target.closest('.leaflet-interactive'))) {
        return;
      }
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
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

interface DraggableMarkerProps {
  point: Point;
  index: number;
  onDragEnd: (index: number, newPosition: Point) => void;
}

function DraggableMarker({ point, index, onDragEnd }: DraggableMarkerProps) {
  const eventHandlers = {
    dragend: (e: { target: LeafletMarker }) => {
      const marker = e.target;
      const position = marker.getLatLng();
      onDragEnd(index, { lat: position.lat, lng: position.lng });
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

// Função para calcular perímetro do polígono em metros
function calculatePolygonPerimeter(points: Point[]): number {
  if (points.length < 3) return 0;
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const nextIndex = (i + 1) % points.length;
    perimeter += calculateDistance(points[i], points[nextIndex]);
  }
  return perimeter;
}

// Função para calcular área do polígono em metros² usando fórmula esférica
function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) return 0;
  
  const R = 6371000; // Raio da Terra em metros
  let area = 0;
  
  // Fechar o polígono
  const closedPoints = [...points, points[0]];
  
  for (let i = 0; i < points.length; i++) {
    const p1 = closedPoints[i];
    const p2 = closedPoints[i + 1];
    
    const lat1Rad = (p1.lat * Math.PI) / 180;
    const lat2Rad = (p2.lat * Math.PI) / 180;
    const dLngRad = ((p2.lng - p1.lng) * Math.PI) / 180;
    
    area += dLngRad * (2 + Math.sin(lat1Rad) + Math.sin(lat2Rad));
  }
  
  area = Math.abs(area * R * R / 2);
  return area;
}

async function getStreetName(point: Point): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${point.lat}&lon=${point.lng}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'WebLocalizador/1.0',
        },
      }
    );
    const data = await response.json();
    
    const address = data.address;
    if (address) {
      return (
        address.road ||
        address.street ||
        address.pedestrian ||
        address.path ||
        address.footway ||
        null
      );
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar nome da rua:', error);
    return null;
  }
}

async function findNearestStreetName(points: Point[]): Promise<string | null> {
  if (points.length === 0) return null;

  // Calcular centroide do polígono
  const centerLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const centerLng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
  
  let streetName = await getStreetName({ lat: centerLat, lng: centerLng });
  if (streetName) return streetName;

  // Tentar alguns pontos do polígono
  for (const point of points.slice(0, 5)) {
    streetName = await getStreetName(point);
    if (streetName) return streetName;
  }

  return null;
}

interface SavedRocada {
  _id: string;
  coordenadasRua: Point[];
  nomeDaRua: string;
  tipo: string;
}

export default function MapDrawArea() {
  const router = useRouter();
  const [points, setPoints] = useState<Point[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedStreetName, setSavedStreetName] = useState<string>('');
  const [streetName, setStreetName] = useState<string | null>(null);
  const [loadingStreetName, setLoadingStreetName] = useState(false);
  const [savedRocadas, setSavedRocadas] = useState<SavedRocada[]>([]);
  const [showSavedLines, setShowSavedLines] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [tilesReady, setTilesReady] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  
  // Estados do formulário
  const [nomeDaRua, setNomeDaRua] = useState<string>('');
  const [dataCadastro, setDataCadastro] = useState<string>('');
  const [comprimento, setComprimento] = useState<string>('');
  const [perimetroRocada, setPerimetroRocada] = useState<string>('');
  const [notasSobreRua, setNotasSobreRua] = useState<string>('');
  const [tempoCorteAtivado, setTempoCorteAtivado] = useState<boolean>(false);
  const [tempoCortePersonalizado, setTempoCortePersonalizado] = useState<string>('');
  
  // Estados do serviço
  const [dataDeServico, setDataDeServico] = useState<string>('');
  const [statusServico, setStatusServico] = useState<'Concluído' | 'Pendente' | 'Não Feito'>('Concluído');
  const [notasServico, setNotasServico] = useState<string>('');

  const fetchRocadas = async () => {
    try {
      const response = await fetch('/api/rocada');
      const result = await response.json();
      if (result.success) {
        console.log('Todas as roçadas:', result.data);
        // Buscar todas as roçadas (áreas e ruas)
        const todasRocadas = result.data.filter((rocada: SavedRocada) => {
          // Se tem tipo definido, inclui tanto áreas quanto ruas
          if (rocada.tipo === 'area' || rocada.tipo === 'rua') return true;
          
          // Se não tem tipo (dados antigos), inclui todas
          if (!rocada.tipo && rocada.coordenadasRua) {
            return rocada.coordenadasRua.length >= 2;
          }
          return false;
        });
        setSavedRocadas(todasRocadas);
        console.log('Roçadas carregadas:', todasRocadas.length, todasRocadas);
      }
    } catch (error) {
      console.error('Erro ao carregar roçadas:', error);
    } finally {
      setDataLoaded(true);
    }
  };

  useEffect(() => {
    fetchRocadas();
  }, []);

  useEffect(() => {
    if (mapReady && tilesReady && dataLoaded) {
      setLoading(false);
    }
  }, [mapReady, tilesReady, dataLoaded]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMapReady = () => {
    setMapReady(true);
  };

  const handleTilesReady = () => {
    setTilesReady(true);
  };

  const handleMapClick = (point: Point) => {
    setPoints((prev) => [...prev, point]);
  };

  const handleMarkerDragEnd = (index: number, newPosition: Point) => {
    setPoints((prev) => {
      const updated = [...prev];
      updated[index] = newPosition;
      return updated;
    });
  };

  const handleRemoveLast = () => {
    if (points.length > 0) {
      setPoints((prev) => prev.slice(0, -1));
    }
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

  const handleSaveArea = async () => {
    if (points.length < 3) return;
    
    setShowModal(true);
    setLoadingStreetName(true);
    setStreetName(null);
    
    const name = await findNearestStreetName(points);
    setStreetName(name);
    setLoadingStreetName(false);
    
    // Calcular perímetro e área do polígono
    const perimeter = calculatePolygonPerimeter(points);
    const area = calculatePolygonArea(points);
    
    // Preencher formulário com valores iniciais
    const currentDateTime = getCurrentDateTime();
    setNomeDaRua(name || '');
    setDataCadastro(currentDateTime);
    setComprimento(perimeter.toFixed(2));
    setPerimetroRocada(area.toFixed(2));
    setNotasSobreRua('');
    setTempoCorteAtivado(false);
    setTempoCortePersonalizado('');
    
    // Preencher dados do serviço
    setDataDeServico(currentDateTime);
    setStatusServico('Concluído');
    updateNotasServico('Concluído', currentDateTime);
  };

  const handleConfirm = async () => {
    const servico = {
      dataDeServico: dataDeServico,
      notasServico: notasServico,
      statusServico: statusServico,
    };
    
    const ruaData = {
      coordenadasRua: points,
      nomeDaRua: nomeDaRua,
      dataCadastro: dataCadastro,
      comprimento: parseFloat(comprimento),
      perimetroRocada: parseFloat(perimetroRocada),
      listaServicos: [servico],
      notasSobreRua: notasSobreRua || '',
      tempoCortePersonalizado: tempoCorteAtivado && tempoCortePersonalizado ? parseInt(tempoCortePersonalizado) : null,
      tipo: 'area' as const,
    };
    
    try {
      const response = await fetch('/api/rocada', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ruaData),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Rocada salva com sucesso:', result.data);
        setShowModal(false);
        setSavedStreetName(nomeDaRua);
        setShowSuccessModal(true);
        // Limpar pontos e resetar formulário
        setPoints([]);
        setNomeDaRua('');
        setDataCadastro('');
        setComprimento('');
        setPerimetroRocada('');
        setNotasSobreRua('');
        setTempoCorteAtivado(false);
        setTempoCortePersonalizado('');
        setDataDeServico('');
        setStatusServico('Concluído');
        setNotasServico('');
        // Recarregar áreas do banco
        await fetchRocadas();
      } else {
        console.error('Erro ao salvar roçada:', result.error);
        alert('Erro ao salvar roçada. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao salvar roçada:', error);
      alert('Erro ao salvar roçada. Tente novamente.');
    }
  };

  const polygonPositions = points.length >= 3
    ? [...points.map((p) => [p.lat, p.lng] as [number, number]), [points[0].lat, points[0].lng] as [number, number]]
    : points.map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <div className="relative h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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
                RM Manager - Adicionar Área
              </h1>
            </div>
            
            {/* Título Mobile */}
            <div className="md:hidden flex items-center gap-2">
              <h1 className="text-base font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Adicionar Área
              </h1>
            </div>

            {/* Navegação */}
            <nav className="flex items-center gap-2 sm:gap-3 ml-auto">
              {/* Botões - Visíveis em telas médias/grandes */}
              <div className="hidden lg:flex items-center gap-3">
                <button
                  className={`px-5 py-2.5 font-medium rounded-lg shadow-lg active:scale-95 transition-all duration-200 ease-out hover:shadow-xl ${
                    showSavedLines
                      ? 'bg-green-600 text-white hover:bg-green-500 border-2 border-green-500'
                      : 'bg-transparent text-green-400 border-2 border-green-500 hover:bg-green-500/10'
                  }`}
                  onClick={() => setShowSavedLines(!showSavedLines)}
                >
                  {showSavedLines ? 'Ocultar Ruas' : 'Mostrar Ruas'}
                </button>
                <button
                  className={`px-5 py-2.5 border-2 font-medium rounded-lg bg-transparent active:scale-95 transition-all duration-200 ease-out ${
                    points.length === 0
                      ? 'border-slate-700 text-slate-600 cursor-not-allowed opacity-50'
                      : 'border-slate-600 text-slate-300 hover:border-slate-500 hover:text-slate-200 hover:shadow-lg hover:shadow-slate-500/50'
                  }`}
                  onClick={handleRemoveLast}
                  disabled={points.length === 0}
                >
                  Remover Último
                </button>
                <button
                  className={`px-5 py-2.5 border-2 font-medium rounded-lg bg-transparent active:scale-95 transition-all duration-200 ease-out ${
                    points.length < 3
                      ? 'border-purple-700 text-purple-600 cursor-not-allowed opacity-50'
                      : 'border-purple-500 text-purple-400 hover:border-purple-400 hover:text-purple-300 hover:shadow-lg hover:shadow-purple-500/50'
                  }`}
                  onClick={handleSaveArea}
                  disabled={points.length < 3}
                >
                  Salvar Área
                </button>
                <button
                  className="px-5 py-2.5 border-2 border-cyan-500 text-cyan-400 font-medium rounded-lg bg-transparent hover:border-cyan-400 hover:text-cyan-300 active:scale-95 transition-all duration-200 ease-out hover:shadow-lg hover:shadow-cyan-500/50"
                  onClick={() => router.push('/')}
                >
                  Voltar
                </button>
              </div>

              {/* Menu Hambúrguer - Visível em telas pequenas */}
              <div className="relative lg:hidden" ref={mobileMenuRef}>
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
                      className={`w-full px-4 py-3 text-left font-medium transition-colors duration-200 border-b border-slate-700/50 ${
                        showSavedLines
                          ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                          : 'text-green-400 hover:bg-slate-700'
                      }`}
                      onClick={() => {
                        setShowSavedLines(!showSavedLines);
                        setShowMobileMenu(false);
                      }}
                    >
                      {showSavedLines ? 'Ocultar Ruas' : 'Mostrar Ruas'}
                    </button>
                    <button
                      className={`w-full px-4 py-3 text-left font-medium transition-colors duration-200 border-b border-slate-700/50 ${
                        points.length === 0
                          ? 'text-slate-600 cursor-not-allowed opacity-50'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                      onClick={() => {
                        if (points.length > 0) {
                          handleRemoveLast();
                          setShowMobileMenu(false);
                        }
                      }}
                      disabled={points.length === 0}
                    >
                      Remover Último
                    </button>
                    <button
                      className={`w-full px-4 py-3 text-left font-medium transition-colors duration-200 border-b border-slate-700/50 ${
                        points.length < 3
                          ? 'text-purple-600 cursor-not-allowed opacity-50'
                          : 'text-purple-400 hover:bg-slate-700 hover:text-purple-300'
                      }`}
                      onClick={() => {
                        if (points.length >= 3) {
                          handleSaveArea();
                          setShowMobileMenu(false);
                        }
                      }}
                      disabled={points.length < 3}
                    >
                      Salvar Área
                    </button>
                    <button
                      className="w-full px-4 py-3 text-left text-cyan-400 hover:bg-slate-700 hover:text-cyan-300 transition-colors duration-200 font-medium"
                      onClick={() => {
                        router.push('/');
                        setShowMobileMenu(false);
                      }}
                    >
                      Voltar
                    </button>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>
      </header>
      
      <div className="pt-[73px] h-screen w-full">
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
          {showSavedLines && savedRocadas.length > 0 && savedRocadas.map((rocada) => {
            if (!rocada.coordenadasRua || rocada.coordenadasRua.length < 2) {
              return null;
            }
            
            const positions = rocada.coordenadasRua.map((p) => [p.lat, p.lng] as [number, number]);
            
            // Verificar se é área (polígono) ou rua (linha)
            const isArea = rocada.tipo === 'area' || 
              (rocada.coordenadasRua.length >= 3 && 
               rocada.coordenadasRua[0].lat === rocada.coordenadasRua[rocada.coordenadasRua.length - 1].lat &&
               rocada.coordenadasRua[0].lng === rocada.coordenadasRua[rocada.coordenadasRua.length - 1].lng);
            
            if (isArea && rocada.coordenadasRua.length >= 3) {
              // Fechar o polígono
              const closedPositions = [...positions, positions[0]];
              return (
                <Polygon
                  key={rocada._id}
                  positions={closedPositions}
                  color="#10b981"
                  weight={3}
                  opacity={0.7}
                  fillColor="#10b981"
                  fillOpacity={0.2}
                />
              );
            } else {
              // Renderizar como linha (rua)
              return (
                <Polyline
                  key={rocada._id}
                  positions={positions}
                  color="#10b981"
                  weight={3}
                  opacity={0.7}
                />
              );
            }
          })}
          <MapClickHandler onMapClick={handleMapClick} />
        {points.map((point, index) => (
          <DraggableMarker
            key={index}
            point={point}
            index={index}
            onDragEnd={handleMarkerDragEnd}
          />
        ))}
        {points.length >= 3 && (
          <Polygon
            positions={polygonPositions}
            color="#3b82f6"
            weight={4}
            opacity={0.8}
            fillColor="#3b82f6"
            fillOpacity={0.2}
          />
        )}
      </MapContainer>
      </div>
      {showModal && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-semibold text-slate-900 mb-6">
              Cadastrar Área
            </h2>
            
            {loadingStreetName ? (
              <p className="text-lg text-slate-600 mb-4">Buscando nome da rua...</p>
            ) : null}
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nome da Rua
                </label>
                <input
                  type="text"
                  value={nomeDaRua}
                  onChange={(e) => setNomeDaRua(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Nome da rua"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Data de Cadastro
                </label>
                <input
                  type="datetime-local"
                  value={dataCadastro}
                  onChange={(e) => setDataCadastro(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Comprimento (Perímetro)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={comprimento}
                    onChange={(e) => setComprimento(e.target.value)}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    step="0.01"
                    min="0"
                  />
                  <span className="text-slate-700 font-medium">metros</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Área de Roçada
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={perimetroRocada}
                    onChange={(e) => setPerimetroRocada(e.target.value)}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    step="0.01"
                    min="0"
                  />
                  <span className="text-slate-700 font-medium">metros²</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notas sobre a Rua
                </label>
                <textarea
                  value={notasSobreRua}
                  onChange={(e) => setNotasSobreRua(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                  placeholder="Adicione notas sobre esta rua..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tempo de Corte Personalizado
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTempoCorteAtivado(!tempoCorteAtivado);
                      if (tempoCorteAtivado) {
                        setTempoCortePersonalizado('');
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      tempoCorteAtivado
                        ? 'bg-slate-900 text-white hover:bg-slate-800'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {tempoCorteAtivado ? 'Desativar' : 'Ativar'}
                  </button>
                  {tempoCorteAtivado && (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="number"
                        value={tempoCortePersonalizado}
                        onChange={(e) => setTempoCortePersonalizado(e.target.value)}
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                        placeholder="Dias"
                        min="0"
                        step="1"
                      />
                      <span className="text-slate-700 font-medium">dias</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Separador */}
              <div className="border-t border-slate-200 my-6"></div>
              
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Serviço Incluso
                </h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Data de Serviço
                </label>
                <input
                  type="datetime-local"
                  value={dataDeServico}
                  onChange={(e) => {
                    setDataDeServico(e.target.value);
                    updateNotasServico(statusServico, e.target.value);
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Status do Serviço
                </label>
                <select
                  value={statusServico}
                  onChange={(e) => {
                    const newStatus = e.target.value as 'Concluído' | 'Pendente' | 'Não Feito';
                    setStatusServico(newStatus);
                    updateNotasServico(newStatus, dataDeServico);
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  <option value="Concluído">Concluído</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Não Feito">Não Feito</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notas do Serviço
                </label>
                <textarea
                  value={notasServico}
                  onChange={(e) => setNotasServico(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                  placeholder="Notas sobre o serviço..."
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-6 py-3 bg-slate-200 text-slate-900 font-medium rounded-lg shadow-lg hover:bg-slate-300 active:scale-95 transition-all duration-200 ease-out"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-6 py-3 bg-slate-900 text-white font-medium rounded-lg shadow-lg hover:bg-slate-800 active:scale-95 transition-all duration-200 ease-out"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      {showSuccessModal && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              Sucesso!
            </h2>
            <p className="text-lg text-slate-700 mb-6">
              <span className="font-medium">{savedStreetName || 'Área'}</span> foi salva com sucesso!
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full px-6 py-3 bg-slate-900 text-white font-medium rounded-lg shadow-lg hover:bg-slate-800 active:scale-95 transition-all duration-200 ease-out"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
