'use client';

import { useState, useEffect, Fragment, useRef } from 'react';
import { useRouter } from 'next/navigation';
import LoadingScreen from '@/components/loadingTela/LoadingScreen';
import TabelaNecessidade from '@/components/TabelaNecessidade';
import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Servico {
  dataDeServico: string;
  statusServico: 'Concluído' | 'Pendente' | 'Não Feito';
  notasServico: string;
}

interface Rocada {
  _id: string;
  nomeDaRua: string;
  tipo: 'rua' | 'area';
  perimetroRocada?: number;
  listaServicos?: Servico[];
  [key: string]: any;
}

interface Bairro {
  _id: string;
  nome: string;
  ruas: string[];
  [key: string]: any;
}

interface Config {
  tempoRocagemPad: number;
  tempoRelPad: number;
  [key: string]: any;
}

interface Servico {
  dataDeServico: string;
  statusServico: 'Concluído' | 'Pendente' | 'Não Feito';
  notasServico: string;
}

export default function Relatorios() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rocadas, setRocadas] = useState<Rocada[]>([]);
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Estados para filtros de data
  const [dataFim, setDataFim] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<string>('');
  
  // Estados para controle de colunas
  const [colunasAtivas, setColunasAtivas] = useState({
    nome: true,
    areaRocada: true,
    areaEfetiva: true,
    ultimoServico: true,
    status: true,
    notas: true,
  });
  
  // Estados para edição de nomeDaRua
  const [modalEditarNome, setModalEditarNome] = useState(false);
  const [rocadaEditando, setRocadaEditando] = useState<any>(null);
  const [nomeEditando, setNomeEditando] = useState<string>('');
  
  // Mapa para armazenar nomes atualizados localmente (sem persistir no banco)
  const [nomesAtualizadosLocal, setNomesAtualizadosLocal] = useState<Map<string, string>>(new Map());
  
  // Estados para edição de perimetroRocada
  const [modalEditarArea, setModalEditarArea] = useState(false);
  const [rocadaEditandoArea, setRocadaEditandoArea] = useState<any>(null);
  const [areaEditando, setAreaEditando] = useState<string>('');
  
  // Mapa para armazenar áreas atualizadas localmente (sem persistir no banco)
  const [areasAtualizadasLocal, setAreasAtualizadasLocal] = useState<Map<string, number>>(new Map());
  
  // Estados para edição de área efetivamente roçada
  const [modalEditarAreaEfetiva, setModalEditarAreaEfetiva] = useState(false);
  const [rocadaEditandoAreaEfetiva, setRocadaEditandoAreaEfetiva] = useState<any>(null);
  const [areaEfetivaEditando, setAreaEfetivaEditando] = useState<string>('');
  
  // Mapa para armazenar áreas efetivas atualizadas localmente (sem persistir no banco)
  const [areasEfetivasAtualizadasLocal, setAreasEfetivasAtualizadasLocal] = useState<Map<string, number>>(new Map());
  
  // Estados para edição de último serviço
  const [modalEditarUltimoServico, setModalEditarUltimoServico] = useState(false);
  const [rocadaEditandoUltimoServico, setRocadaEditandoUltimoServico] = useState<any>(null);
  const [ultimoServicoEditando, setUltimoServicoEditando] = useState<string>('');
  
  // Mapa para armazenar últimos serviços atualizados localmente
  const [ultimosServicosAtualizadosLocal, setUltimosServicosAtualizadosLocal] = useState<Map<string, string>>(new Map());
  
  // Estados para edição de status
  const [modalEditarStatus, setModalEditarStatus] = useState(false);
  const [rocadaEditandoStatus, setRocadaEditandoStatus] = useState<any>(null);
  const [statusEditando, setStatusEditando] = useState<string>('');
  
  // Mapa para armazenar status atualizados localmente
  const [statusAtualizadosLocal, setStatusAtualizadosLocal] = useState<Map<string, string>>(new Map());
  
  // Estados para edição de notas de serviço
  const [modalEditarNotas, setModalEditarNotas] = useState(false);
  const [rocadaEditandoNotas, setRocadaEditandoNotas] = useState<any>(null);
  const [notasEditando, setNotasEditando] = useState<string>('');
  
  // Mapa para armazenar notas atualizadas localmente
  const [notasAtualizadasLocal, setNotasAtualizadasLocal] = useState<Map<string, string>>(new Map());

  // Estados para filtros
  const [filtroTexto, setFiltroTexto] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('Todos');
  const [filtroBairro, setFiltroBairro] = useState<string>('Todos');

  // Estado para menu mobile
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Carregar todas as coleções
        const [rocadasRes, bairrosRes, configRes] = await Promise.all([
          fetch('/api/rocada'),
          fetch('/api/bairros'),
          fetch('/api/config'),
        ]);

        const rocadasResult = await rocadasRes.json();
        const bairrosResult = await bairrosRes.json();
        const configResult = await configRes.json();

        if (rocadasResult.success) {
          setRocadas(rocadasResult.data);
        }
        if (bairrosResult.success) {
          setBairros(bairrosResult.data);
        }
        if (configResult.success) {
          setConfig(configResult.data);
          
          // Configurar datas iniciais
          const hoje = new Date();
          hoje.setHours(23, 59, 59, 999); // Fim do dia
          const dataFimStr = hoje.toISOString().slice(0, 16);
          setDataFim(dataFimStr);
          
          // Data início = data fim - tempoRelPad dias
          const dataInicioCalc = new Date(hoje);
          dataInicioCalc.setDate(dataInicioCalc.getDate() - (configResult.data.tempoRelPad || 30));
          dataInicioCalc.setHours(0, 0, 0, 0); // Início do dia
          const dataInicioStr = dataInicioCalc.toISOString().slice(0, 16);
          setDataInicio(dataInicioStr);
        }

        setDataLoaded(true);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Filtrar roçadas que têm serviços no intervalo de datas
  const rocadasFiltradas = dataInicio && dataFim ? rocadas.filter((rocada) => {
    if (!rocada.listaServicos || rocada.listaServicos.length === 0) {
      return false;
    }

    const dataInicioDate = new Date(dataInicio);
    const dataFimDate = new Date(dataFim);

    // Verificar se algum serviço está no intervalo
    return rocada.listaServicos.some((servico: Servico) => {
      const dataServico = new Date(servico.dataDeServico);
      return dataServico >= dataInicioDate && dataServico <= dataFimDate;
    });
  }) : [];

  // Função auxiliar para obter todos os serviços no intervalo
  const getServicosNoIntervalo = (rocada: Rocada): Servico[] => {
    if (!rocada.listaServicos || rocada.listaServicos.length === 0) return [];
    
    if (!dataInicio || !dataFim) return [];
    
    const dataInicioDate = new Date(dataInicio);
    const dataFimDate = new Date(dataFim);
    
    const servicosNoIntervalo = rocada.listaServicos.filter((servico: Servico) => {
      const dataServico = new Date(servico.dataDeServico);
      return dataServico >= dataInicioDate && dataServico <= dataFimDate;
    });
    
    // Ordenar por data (mais recente primeiro)
    return servicosNoIntervalo.sort((s1: Servico, s2: Servico) => {
      return new Date(s2.dataDeServico).getTime() - new Date(s1.dataDeServico).getTime();
    });
  };

  // Função auxiliar para obter o último serviço no intervalo (mantida para compatibilidade com filtros)
  const getUltimoServicoNoIntervalo = (rocada: Rocada) => {
    const servicos = getServicosNoIntervalo(rocada);
    return servicos.length > 0 ? servicos[0] : null;
  };

  // Função para obter o nome atualizado (local ou original)
  const getNomeAtualizado = (rocada: any): string => {
    return nomesAtualizadosLocal.get(rocada._id) || rocada.nomeDaRua;
  };

  // Função para obter o status atualizado (local ou original)
  const getStatusAtualizado = (rocada: any, ultimoServico: any): 'Concluído' | 'Pendente' | 'Não Feito' | undefined => {
    return statusAtualizadosLocal.get(rocada._id) || (ultimoServico ? ultimoServico.statusServico : undefined);
  };

  // Aplicar filtros adicionais antes de ordenar
  let rocadasComFiltros = dataInicio && dataFim ? [...rocadasFiltradas] : [];

  // Filtro de texto
  if (filtroTexto.trim()) {
    const textoLower = filtroTexto.toLowerCase();
    rocadasComFiltros = rocadasComFiltros.filter((rocada) => {
      const nome = getNomeAtualizado(rocada).toLowerCase();
      return nome.includes(textoLower);
    });
  }

  // Filtro de status
  if (filtroStatus !== 'Todos') {
    rocadasComFiltros = rocadasComFiltros.filter((rocada) => {
      const ultimoServico = getUltimoServicoNoIntervalo(rocada);
      const statusAtual = getStatusAtualizado(rocada, ultimoServico);
      return statusAtual === filtroStatus;
    });
  }

  // Filtro de bairro
  if (filtroBairro !== 'Todos') {
    rocadasComFiltros = rocadasComFiltros.filter((rocada) => {
      const bairroEncontrado = bairros.find((bairro) => bairro.ruas.includes(rocada._id));
      if (filtroBairro === 'sem-bairro') {
        return !bairroEncontrado;
      }
      return bairroEncontrado?._id === filtroBairro;
    });
  }

  // Criar lista de itens (roçada + serviço) para cada serviço no período
  interface ItemTabela {
    rocada: Rocada;
    servico: Servico;
  }

  const itensTabela: ItemTabela[] = [];
  
  if (rocadasComFiltros && Array.isArray(rocadasComFiltros)) {
    rocadasComFiltros.forEach((rocada) => {
      const servicosNoIntervalo = getServicosNoIntervalo(rocada);
      if (servicosNoIntervalo && Array.isArray(servicosNoIntervalo)) {
        servicosNoIntervalo.forEach((servico) => {
          itensTabela.push({ rocada, servico });
        });
      }
    });
  }

  // Ordenar itens pela data do serviço (mais recente primeiro)
  const itensOrdenados = itensTabela.sort((a, b) => {
    return new Date(b.servico.dataDeServico).getTime() - new Date(a.servico.dataDeServico).getTime();
  });

  // Agrupar itens por bairro
  const itensPorBairro: { [key: string]: { bairro: Bairro | null; itens: ItemTabela[] } } = {};
  
  // Inicializar com "Sem Bairro"
  itensPorBairro['sem-bairro'] = { bairro: null, itens: [] };

  // Adicionar bairros
  if (bairros && Array.isArray(bairros)) {
    bairros.forEach((bairro) => {
      itensPorBairro[bairro._id] = { bairro, itens: [] };
    });
  }

  // Distribuir itens pelos bairros
  itensOrdenados.forEach((item) => {
    const bairroEncontrado = bairros && Array.isArray(bairros) 
      ? bairros.find((bairro) => bairro.ruas.includes(item.rocada._id))
      : null;
    
    if (bairroEncontrado) {
      itensPorBairro[bairroEncontrado._id].itens.push(item);
    } else {
      itensPorBairro['sem-bairro'].itens.push(item);
    }
  });

  // Ordenar bairros: primeiro os com itens, depois "Sem Bairro" por último
  const bairrosOrdenados = Object.entries(itensPorBairro)
    .filter(([_, data]) => data && data.itens && data.itens.length > 0)
    .sort(([keyA, dataA], [keyB, dataB]) => {
      if (keyA === 'sem-bairro') return 1;
      if (keyB === 'sem-bairro') return -1;
      if (dataA.bairro && dataB.bairro) {
        return dataA.bairro.nome.localeCompare(dataB.bairro.nome);
      }
      return 0;
    });

  // Função para exportar para Excel

  // Função para obter a área atualizada (local ou original)
  const getAreaAtualizada = (rocada: any): number => {
    return areasAtualizadasLocal.get(rocada._id) ?? (rocada.perimetroRocada || 0);
  };

  // Função para obter a área efetiva atualizada (local ou calculada)
  const getAreaEfetivaAtualizada = (rocada: any, ultimoServico: any): number => {
    // Se houver uma área efetiva atualizada localmente, usar ela
    if (areasEfetivasAtualizadasLocal.has(rocada._id)) {
      return areasEfetivasAtualizadasLocal.get(rocada._id)!;
    }
    
    // Caso contrário, calcular baseado na área atualizada e status do serviço
    const areaRocada = getAreaAtualizada(rocada);
    if (ultimoServico) {
      if (ultimoServico.statusServico === 'Concluído') {
        return areaRocada;
      } else if (ultimoServico.statusServico === 'Pendente') {
        return areaRocada * 0.5;
      } else {
        return 0;
      }
    }
    return 0;
  };

  // Função para atualizar apenas na tabela
  const handleAtualizarNaTabela = () => {
    if (!rocadaEditando) return;
    
    const novoMap = new Map(nomesAtualizadosLocal);
    novoMap.set(rocadaEditando._id, nomeEditando);
    setNomesAtualizadosLocal(novoMap);
    setModalEditarNome(false);
    setRocadaEditando(null);
    setNomeEditando('');
  };

  // Função para atualizar no banco de dados
  const handleAtualizarNoBanco = async () => {
    if (!rocadaEditando) return;
    
    try {
      const response = await fetch(`/api/rocada/${rocadaEditando._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nomeDaRua: nomeEditando }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Atualizar no estado local das rocadas
        setRocadas((prevRocadas) =>
          prevRocadas.map((r) =>
            r._id === rocadaEditando._id
              ? { ...r, nomeDaRua: nomeEditando }
              : r
          )
        );
        
        // Remover do mapa de nomes atualizados localmente (já está no banco)
        const novoMap = new Map(nomesAtualizadosLocal);
        novoMap.delete(rocadaEditando._id);
        setNomesAtualizadosLocal(novoMap);
        
        setModalEditarNome(false);
        setRocadaEditando(null);
        setNomeEditando('');
      } else {
        console.error('Erro ao atualizar roçada:', result.error);
        alert('Erro ao atualizar roçada. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao atualizar roçada:', error);
      alert('Erro ao atualizar roçada. Tente novamente.');
    }
  };

  // Função para atualizar área apenas na tabela
  const handleAtualizarAreaNaTabela = () => {
    if (!rocadaEditandoArea) return;
    
    const areaNumero = parseFloat(areaEditando);
    if (isNaN(areaNumero)) {
      alert('Por favor, insira um valor numérico válido.');
      return;
    }
    
    const novoMap = new Map(areasAtualizadasLocal);
    novoMap.set(rocadaEditandoArea._id, areaNumero);
    setAreasAtualizadasLocal(novoMap);
    setModalEditarArea(false);
    setRocadaEditandoArea(null);
    setAreaEditando('');
  };

  // Função para atualizar área no banco de dados
  const handleAtualizarAreaNoBanco = async () => {
    if (!rocadaEditandoArea) return;
    
    const areaNumero = parseFloat(areaEditando);
    if (isNaN(areaNumero)) {
      alert('Por favor, insira um valor numérico válido.');
      return;
    }
    
    try {
      const response = await fetch(`/api/rocada/${rocadaEditandoArea._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ perimetroRocada: areaNumero }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Atualizar no estado local das rocadas
        setRocadas((prevRocadas) =>
          prevRocadas.map((r) =>
            r._id === rocadaEditandoArea._id
              ? { ...r, perimetroRocada: areaNumero }
              : r
          )
        );
        
        // Remover do mapa de áreas atualizadas localmente (já está no banco)
        const novoMap = new Map(areasAtualizadasLocal);
        novoMap.delete(rocadaEditandoArea._id);
        setAreasAtualizadasLocal(novoMap);
        
        setModalEditarArea(false);
        setRocadaEditandoArea(null);
        setAreaEditando('');
      } else {
        console.error('Erro ao atualizar roçada:', result.error);
        alert('Erro ao atualizar roçada. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao atualizar roçada:', error);
      alert('Erro ao atualizar roçada. Tente novamente.');
    }
  };

  // Função para atualizar área efetiva apenas na tabela
  const handleAtualizarAreaEfetivaNaTabela = () => {
    if (!rocadaEditandoAreaEfetiva) return;
    
    const areaNumero = parseFloat(areaEfetivaEditando);
    if (isNaN(areaNumero)) {
      alert('Por favor, insira um valor numérico válido.');
      return;
    }
    
    const novoMap = new Map(areasEfetivasAtualizadasLocal);
    novoMap.set(rocadaEditandoAreaEfetiva._id, areaNumero);
    setAreasEfetivasAtualizadasLocal(novoMap);
    setModalEditarAreaEfetiva(false);
    setRocadaEditandoAreaEfetiva(null);
    setAreaEfetivaEditando('');
  };

  // Funções para obter valores atualizados dos campos de serviço
  const getUltimoServicoAtualizado = (rocada: any, ultimoServico: any): string => {
    if (ultimosServicosAtualizadosLocal.has(rocada._id)) {
      return ultimosServicosAtualizadosLocal.get(rocada._id)!;
    }
    return ultimoServico ? ultimoServico.dataDeServico : '';
  };


  const getNotasAtualizadas = (rocada: any, ultimoServico: any): string => {
    if (notasAtualizadasLocal.has(rocada._id)) {
      return notasAtualizadasLocal.get(rocada._id)!;
    }
    return ultimoServico && ultimoServico.notasServico ? ultimoServico.notasServico : '';
  };

  // Função para atualizar último serviço apenas na tabela
  const handleAtualizarUltimoServicoNaTabela = () => {
    if (!rocadaEditandoUltimoServico) return;
    
    const novoMap = new Map(ultimosServicosAtualizadosLocal);
    novoMap.set(rocadaEditandoUltimoServico._id, ultimoServicoEditando);
    setUltimosServicosAtualizadosLocal(novoMap);
    setModalEditarUltimoServico(false);
    setRocadaEditandoUltimoServico(null);
    setUltimoServicoEditando('');
  };

  // Função para atualizar último serviço no banco de dados
  const handleAtualizarUltimoServicoNoBanco = async () => {
    if (!rocadaEditandoUltimoServico) return;
    
    const ultimoServico = getUltimoServicoNoIntervalo(rocadaEditandoUltimoServico);
    if (!ultimoServico) {
      alert('Não há serviço para atualizar.');
      return;
    }
    
    try {
      // Encontrar o índice do último serviço na lista
      const listaServicos = rocadaEditandoUltimoServico.listaServicos || [];
      const ultimoIndex = listaServicos.length - 1;
      
      // Atualizar o último serviço
      const listaServicosAtualizada = [...listaServicos];
      listaServicosAtualizada[ultimoIndex] = {
        ...listaServicosAtualizada[ultimoIndex],
        dataDeServico: ultimoServicoEditando,
      };
      
      const response = await fetch(`/api/rocada/${rocadaEditandoUltimoServico._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ listaServicos: listaServicosAtualizada }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Atualizar no estado local das rocadas
        setRocadas((prevRocadas) =>
          prevRocadas.map((r) =>
            r._id === rocadaEditandoUltimoServico._id
              ? { ...r, listaServicos: listaServicosAtualizada }
              : r
          )
        );
        
        // Remover do mapa de últimos serviços atualizados localmente
        const novoMap = new Map(ultimosServicosAtualizadosLocal);
        novoMap.delete(rocadaEditandoUltimoServico._id);
        setUltimosServicosAtualizadosLocal(novoMap);
        
        setModalEditarUltimoServico(false);
        setRocadaEditandoUltimoServico(null);
        setUltimoServicoEditando('');
      } else {
        console.error('Erro ao atualizar roçada:', result.error);
        alert('Erro ao atualizar roçada. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao atualizar roçada:', error);
      alert('Erro ao atualizar roçada. Tente novamente.');
    }
  };

  // Função para atualizar status apenas na tabela
  const handleAtualizarStatusNaTabela = () => {
    if (!rocadaEditandoStatus) return;
    
    const novoMap = new Map(statusAtualizadosLocal);
    novoMap.set(rocadaEditandoStatus._id, statusEditando);
    setStatusAtualizadosLocal(novoMap);
    setModalEditarStatus(false);
    setRocadaEditandoStatus(null);
    setStatusEditando('');
  };

  // Função para atualizar status no banco de dados
  const handleAtualizarStatusNoBanco = async () => {
    if (!rocadaEditandoStatus) return;
    
    const ultimoServico = getUltimoServicoNoIntervalo(rocadaEditandoStatus);
    if (!ultimoServico) {
      alert('Não há serviço para atualizar.');
      return;
    }
    
    try {
      // Encontrar o índice do último serviço na lista
      const listaServicos = rocadaEditandoStatus.listaServicos || [];
      const ultimoIndex = listaServicos.length - 1;
      
      // Atualizar o último serviço
      const listaServicosAtualizada = [...listaServicos];
      listaServicosAtualizada[ultimoIndex] = {
        ...listaServicosAtualizada[ultimoIndex],
        statusServico: statusEditando as 'Concluído' | 'Pendente' | 'Não Feito',
      };
      
      const response = await fetch(`/api/rocada/${rocadaEditandoStatus._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ listaServicos: listaServicosAtualizada }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Atualizar no estado local das rocadas
        setRocadas((prevRocadas) =>
          prevRocadas.map((r) =>
            r._id === rocadaEditandoStatus._id
              ? { ...r, listaServicos: listaServicosAtualizada }
              : r
          )
        );
        
        // Remover do mapa de status atualizados localmente
        const novoMap = new Map(statusAtualizadosLocal);
        novoMap.delete(rocadaEditandoStatus._id);
        setStatusAtualizadosLocal(novoMap);
        
        setModalEditarStatus(false);
        setRocadaEditandoStatus(null);
        setStatusEditando('');
      } else {
        console.error('Erro ao atualizar roçada:', result.error);
        alert('Erro ao atualizar roçada. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao atualizar roçada:', error);
      alert('Erro ao atualizar roçada. Tente novamente.');
    }
  };

  // Função para atualizar notas apenas na tabela
  const handleAtualizarNotasNaTabela = () => {
    if (!rocadaEditandoNotas) return;
    
    const novoMap = new Map(notasAtualizadasLocal);
    novoMap.set(rocadaEditandoNotas._id, notasEditando);
    setNotasAtualizadasLocal(novoMap);
    setModalEditarNotas(false);
    setRocadaEditandoNotas(null);
    setNotasEditando('');
  };

  // Função para atualizar notas no banco de dados
  const handleAtualizarNotasNoBanco = async () => {
    if (!rocadaEditandoNotas) return;
    
    const ultimoServico = getUltimoServicoNoIntervalo(rocadaEditandoNotas);
    if (!ultimoServico) {
      alert('Não há serviço para atualizar.');
      return;
    }
    
    try {
      // Encontrar o índice do último serviço na lista
      const listaServicos = rocadaEditandoNotas.listaServicos || [];
      const ultimoIndex = listaServicos.length - 1;
      
      // Atualizar o último serviço
      const listaServicosAtualizada = [...listaServicos];
      listaServicosAtualizada[ultimoIndex] = {
        ...listaServicosAtualizada[ultimoIndex],
        notasServico: notasEditando,
      };
      
      const response = await fetch(`/api/rocada/${rocadaEditandoNotas._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ listaServicos: listaServicosAtualizada }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Atualizar no estado local das rocadas
        setRocadas((prevRocadas) =>
          prevRocadas.map((r) =>
            r._id === rocadaEditandoNotas._id
              ? { ...r, listaServicos: listaServicosAtualizada }
              : r
          )
        );
        
        // Remover do mapa de notas atualizadas localmente
        const novoMap = new Map(notasAtualizadasLocal);
        novoMap.delete(rocadaEditandoNotas._id);
        setNotasAtualizadasLocal(novoMap);
        
        setModalEditarNotas(false);
        setRocadaEditandoNotas(null);
        setNotasEditando('');
      } else {
        console.error('Erro ao atualizar roçada:', result.error);
        alert('Erro ao atualizar roçada. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao atualizar roçada:', error);
      alert('Erro ao atualizar roçada. Tente novamente.');
    }
  };

  const exportarParaExcel = () => {
    const formatarData = (dataStr: string) => {
      const data = new Date(dataStr);
      return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    // Preparar dados para Excel
    const dadosExcel: any[] = [];
    const indicesBairros: number[] = [];
    const indicesLinhasDados: number[] = [];

    // Definir ordem e mapeamento das colunas
    const colunas = [
      { key: 'nome', label: 'Nome', ativa: colunasAtivas.nome },
      { key: 'areaRocada', label: 'Área de Roçada', ativa: colunasAtivas.areaRocada },
      { key: 'areaEfetiva', label: 'Área Efetivamente Roçada', ativa: colunasAtivas.areaEfetiva },
      { key: 'ultimoServico', label: 'Último Serviço', ativa: colunasAtivas.ultimoServico },
      { key: 'status', label: 'Status', ativa: colunasAtivas.status },
      { key: 'notas', label: 'Notas de Serviço', ativa: colunasAtivas.notas },
    ];
    
    const colunasAtivasList = colunas.filter(c => c.ativa);
    
    // Adicionar cabeçalho apenas com colunas ativas
    const cabecalho: any = {};
    colunasAtivasList.forEach(col => {
      cabecalho[col.label] = col.label;
    });
    dadosExcel.push(cabecalho);

    let linhaAtual = 1; // Começa em 1 porque linha 0 é o cabeçalho

    bairrosOrdenados.forEach(([bairroId, { bairro, itens }]) => {
      linhaAtual++;
      indicesBairros.push(linhaAtual);
      
      // Adicionar linha de cabeçalho do bairro
      const linhaBairro: any = {};
      colunasAtivasList.forEach(col => {
        if (col.key === 'nome') {
          linhaBairro[col.label] = bairro ? bairro.nome : 'Sem Bairro';
        } else if (col.key === 'notas') {
          linhaBairro[col.label] = `(${itens.length} ${itens.length === 1 ? 'serviço' : 'serviços'})`;
        } else {
          linhaBairro[col.label] = '';
        }
      });
      dadosExcel.push(linhaBairro);

      // Adicionar itens (roçada + serviço) do bairro
      itens.forEach((item) => {
        const { rocada, servico } = item;
        linhaAtual++;
        indicesLinhasDados.push(linhaAtual);
        
        const areaRocada = getAreaAtualizada(rocada);
        let areaEfetiva = 0;

        if (servico.statusServico === 'Concluído') {
          areaEfetiva = areaRocada;
        } else if (servico.statusServico === 'Pendente') {
          areaEfetiva = areaRocada * 0.5;
        } else {
          areaEfetiva = 0;
        }

        const linhaDados: any = {};
        colunasAtivasList.forEach(col => {
          if (col.key === 'nome') {
            linhaDados[col.label] = getNomeAtualizado(rocada);
          } else if (col.key === 'areaRocada') {
            const areaAtual = getAreaAtualizada(rocada);
            linhaDados[col.label] = areaAtual > 0 ? `${areaAtual.toFixed(2)} m²` : '-';
          } else if (col.key === 'areaEfetiva') {
            linhaDados[col.label] = areaEfetiva > 0 ? `${areaEfetiva.toFixed(2)} m²` : '-';
          } else if (col.key === 'ultimoServico') {
            linhaDados[col.label] = formatarData(servico.dataDeServico);
          } else if (col.key === 'status') {
            const statusAtual = statusAtualizadosLocal.get(rocada._id) || servico.statusServico;
            linhaDados[col.label] = statusAtual || '-';
          } else if (col.key === 'notas') {
            linhaDados[col.label] = servico.notasServico || '-';
          }
        });
        dadosExcel.push(linhaDados);
      });

      // Adicionar linha em branco entre bairros
      linhaAtual++;
      const linhaVazia: any = {};
      colunasAtivasList.forEach(col => {
        linhaVazia[col.label] = '';
      });
      dadosExcel.push(linhaVazia);
    });

    // Calcular totais
    let totalAreaRocada = 0;
    let totalAreaEfetiva = 0;
    const rocadasUnicas = new Set<string>();
    bairrosOrdenados.forEach(([_, { itens }]) => {
      itens.forEach((item) => {
        const { rocada, servico } = item;
        // Contar área de roçada apenas uma vez por roçada
        if (!rocadasUnicas.has(rocada._id)) {
          totalAreaRocada += getAreaAtualizada(rocada);
          rocadasUnicas.add(rocada._id);
        }
        // Área efetiva baseada no serviço atual
        const areaRocada = getAreaAtualizada(rocada);
        if (servico.statusServico === 'Concluído') {
          totalAreaEfetiva += areaRocada;
        } else if (servico.statusServico === 'Pendente') {
          totalAreaEfetiva += areaRocada * 0.5;
        }
      });
    });

    // Adicionar linha de totais
    linhaAtual++;
    const linhaTotais: any = {};
    colunasAtivasList.forEach(col => {
      if (col.key === 'nome') {
        linhaTotais[col.label] = 'TOTAIS';
      } else if (col.key === 'areaRocada') {
        linhaTotais[col.label] = `${totalAreaRocada.toFixed(2)} m²`;
      } else if (col.key === 'areaEfetiva') {
        linhaTotais[col.label] = `${totalAreaEfetiva.toFixed(2)} m²`;
      } else {
        linhaTotais[col.label] = '';
      }
    });
    dadosExcel.push(linhaTotais);
    indicesLinhasDados.push(linhaAtual);

    // Criar workbook e worksheet
    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    
    // Definir larguras das colunas (apenas para colunas ativas)
    const largurasColunas: { [key: string]: number } = {
      'nome': 30,
      'areaRocada': 18,
      'areaEfetiva': 25,
      'ultimoServico': 20,
      'status': 12,
      'notas': 50,
    };
    
    ws['!cols'] = colunasAtivasList.map(col => ({ wch: largurasColunas[col.key] || 15 }));

    // Estilos
    const estiloCabecalho = {
      fill: { fgColor: { rgb: '1e293b' } }, // slate-800
      font: { bold: true, color: { rgb: 'e2e8f0' }, sz: 11 }, // slate-200
      alignment: { horizontal: 'left', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '475569' } },
        bottom: { style: 'thin', color: { rgb: '475569' } },
        left: { style: 'thin', color: { rgb: '475569' } },
        right: { style: 'thin', color: { rgb: '475569' } },
      },
    };

    const estiloBairro = {
      fill: { fgColor: { rgb: '0e7490' } }, // cyan-700
      font: { bold: true, color: { rgb: '67e8f9' }, sz: 12 }, // cyan-300
      alignment: { horizontal: 'left', vertical: 'center' },
      border: {
        top: { style: 'medium', color: { rgb: '06b6d4' } },
        bottom: { style: 'medium', color: { rgb: '06b6d4' } },
        left: { style: 'thin', color: { rgb: '06b6d4' } },
        right: { style: 'thin', color: { rgb: '06b6d4' } },
      },
    };

    const estiloLinhaDados = {
      fill: { fgColor: { rgb: '1e293b' } }, // slate-800
      font: { color: { rgb: 'cbd5e1' }, sz: 10 }, // slate-300
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: '334155' } },
        bottom: { style: 'thin', color: { rgb: '334155' } },
        left: { style: 'thin', color: { rgb: '334155' } },
        right: { style: 'thin', color: { rgb: '334155' } },
      },
    };

    const estiloLinhaDadosAlternada = {
      fill: { fgColor: { rgb: '0f172a' } }, // slate-900
      font: { color: { rgb: 'cbd5e1' }, sz: 10 }, // slate-300
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: '334155' } },
        bottom: { style: 'thin', color: { rgb: '334155' } },
        left: { style: 'thin', color: { rgb: '334155' } },
        right: { style: 'thin', color: { rgb: '334155' } },
      },
    };

    // Gerar letras das colunas dinamicamente (A, B, C, ...)
    const letrasColunas = colunasAtivasList.map((_, index) => {
      return String.fromCharCode(65 + index); // A=65, B=66, etc.
    });

    // Aplicar estilos ao cabeçalho (linha 1)
    letrasColunas.forEach((col) => {
      const cell = ws[`${col}1`];
      if (cell) {
        ws[`${col}1`].s = estiloCabecalho;
      }
    });

    // Aplicar estilos às linhas de bairro
    indicesBairros.forEach((linha) => {
      letrasColunas.forEach((col) => {
        const cell = ws[`${col}${linha + 1}`];
        if (cell) {
          ws[`${col}${linha + 1}`].s = estiloBairro;
        }
      });
    });

    // Aplicar estilos às linhas de dados
    const linhaTotaisIndex = linhaAtual;
    indicesLinhasDados.forEach((linha, index) => {
      // Verificar se é a linha de totais
      const isLinhaTotais = linha === linhaTotaisIndex;
      const estilo = isLinhaTotais 
        ? {
            fill: { fgColor: { rgb: '0e7490' } }, // cyan-700
            font: { bold: true, color: { rgb: '67e8f9' }, sz: 11 }, // cyan-300
            alignment: { horizontal: 'left', vertical: 'center' },
            border: {
              top: { style: 'medium', color: { rgb: '06b6d4' } },
              bottom: { style: 'medium', color: { rgb: '06b6d4' } },
              left: { style: 'thin', color: { rgb: '06b6d4' } },
              right: { style: 'thin', color: { rgb: '06b6d4' } },
            },
          }
        : index % 2 === 0 ? estiloLinhaDados : estiloLinhaDadosAlternada;
      
      letrasColunas.forEach((col, colIndex) => {
        const cell = ws[`${col}${linha + 1}`];
        if (cell) {
          const estiloCelula = { ...estilo };
          
          // Aplicar cor especial para coluna de Status (apenas se não for linha de totais)
          if (!isLinhaTotais) {
            const colunaAtual = colunasAtivasList[colIndex];
            if (colunaAtual && colunaAtual.key === 'status' && cell.v && cell.v !== '-') {
              if (cell.v === 'Concluído') {
                estiloCelula.fill = { fgColor: { rgb: '166534' } }; // green-800
                estiloCelula.font = { ...estiloCelula.font, color: { rgb: '86efac' } }; // green-300
              } else if (cell.v === 'Pendente') {
                estiloCelula.fill = { fgColor: { rgb: '854d0e' } }; // yellow-800
                estiloCelula.font = { ...estiloCelula.font, color: { rgb: 'fde047' } }; // yellow-300
              } else {
                estiloCelula.fill = { fgColor: { rgb: '991b1b' } }; // red-800
                estiloCelula.font = { ...estiloCelula.font, color: { rgb: 'fca5a5' } }; // red-300
              }
            }
          }
          
          ws[`${col}${linha + 1}`].s = estiloCelula;
        }
      });
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório de Roçadas');

    // Gerar nome do arquivo com data
    const dataAtual = new Date();
    const dataFormatada = dataAtual.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).replace(/\//g, '-');
    const nomeArquivo = `Relatorio_Rocadas_${dataFormatada}.xlsx`;

    // Fazer download
    XLSX.writeFile(wb, nomeArquivo);
  };

  const exportarParaPDF = () => {
    const formatarData = (dataStr: string) => {
      const data = new Date(dataStr);
      return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    // Criar novo documento PDF
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // Definir ordem e mapeamento das colunas
    const colunas = [
      { key: 'nome', label: 'Nome', ativa: colunasAtivas.nome },
      { key: 'areaRocada', label: 'Área de Roçada', ativa: colunasAtivas.areaRocada },
      { key: 'areaEfetiva', label: 'Área Efetivamente Roçada', ativa: colunasAtivas.areaEfetiva },
      { key: 'ultimoServico', label: 'Último Serviço', ativa: colunasAtivas.ultimoServico },
      { key: 'status', label: 'Status', ativa: colunasAtivas.status },
      { key: 'notas', label: 'Notas de Serviço', ativa: colunasAtivas.notas },
    ];
    
    const colunasAtivasList = colunas.filter(c => c.ativa);
    
    // Preparar dados para PDF
    const dadosPDF: any[][] = [];
    const indicesLinhasBairro: number[] = [];
    
    // Adicionar cabeçalho
    const cabecalho = colunasAtivasList.map(col => col.label);

    // Adicionar dados por bairro
    let linhaIndex = 0;
    bairrosOrdenados.forEach(([bairroId, { bairro, itens }]) => {
      // Adicionar linha de cabeçalho do bairro
      const linhaBairro: any[] = [];
      colunasAtivasList.forEach(col => {
        if (col.key === 'nome') {
          linhaBairro.push(bairro ? bairro.nome : 'Sem Bairro');
        } else if (col.key === 'notas') {
          linhaBairro.push(`(${itens.length} ${itens.length === 1 ? 'serviço' : 'serviços'})`);
        } else {
          linhaBairro.push('');
        }
      });
      dadosPDF.push(linhaBairro);
      indicesLinhasBairro.push(linhaIndex);
      linhaIndex++;

      // Adicionar itens (roçada + serviço) do bairro
      itens.forEach((item) => {
        const { rocada, servico } = item;
        const areaRocada = getAreaAtualizada(rocada);
        let areaEfetiva = 0;

        if (servico.statusServico === 'Concluído') {
          areaEfetiva = areaRocada;
        } else if (servico.statusServico === 'Pendente') {
          areaEfetiva = areaRocada * 0.5;
        } else {
          areaEfetiva = 0;
        }

        const linhaDados: any[] = [];
        colunasAtivasList.forEach(col => {
          if (col.key === 'nome') {
            linhaDados.push(getNomeAtualizado(rocada));
          } else if (col.key === 'areaRocada') {
            const areaAtual = getAreaAtualizada(rocada);
            linhaDados.push(areaAtual > 0 ? `${areaAtual.toFixed(2)} m²` : '-');
          } else if (col.key === 'areaEfetiva') {
            linhaDados.push(areaEfetiva > 0 ? `${areaEfetiva.toFixed(2)} m²` : '-');
          } else if (col.key === 'ultimoServico') {
            linhaDados.push(formatarData(servico.dataDeServico));
          } else if (col.key === 'status') {
            const statusAtual = statusAtualizadosLocal.get(rocada._id) || servico.statusServico;
            linhaDados.push(statusAtual || '-');
          } else if (col.key === 'notas') {
            linhaDados.push(servico.notasServico || '-');
          }
        });
        dadosPDF.push(linhaDados);
        linhaIndex++;
      });

      // Adicionar linha em branco entre bairros
      dadosPDF.push(colunasAtivasList.map(() => ''));
      linhaIndex++;
    });

    // Calcular totais
    let totalAreaRocada = 0;
    let totalAreaEfetiva = 0;
    const rocadasUnicas = new Set<string>();
    bairrosOrdenados.forEach(([_, { itens }]) => {
      itens.forEach((item) => {
        const { rocada, servico } = item;
        // Contar área de roçada apenas uma vez por roçada
        if (!rocadasUnicas.has(rocada._id)) {
          totalAreaRocada += getAreaAtualizada(rocada);
          rocadasUnicas.add(rocada._id);
        }
        // Área efetiva baseada no serviço atual
        const areaRocada = getAreaAtualizada(rocada);
        if (servico.statusServico === 'Concluído') {
          totalAreaEfetiva += areaRocada;
        } else if (servico.statusServico === 'Pendente') {
          totalAreaEfetiva += areaRocada * 0.5;
        }
      });
    });

    // Adicionar linha de totais
    const linhaTotais: any[] = [];
    colunasAtivasList.forEach(col => {
      if (col.key === 'nome') {
        linhaTotais.push('TOTAIS');
      } else if (col.key === 'areaRocada') {
        linhaTotais.push(`${totalAreaRocada.toFixed(2)} m²`);
      } else if (col.key === 'areaEfetiva') {
        linhaTotais.push(`${totalAreaEfetiva.toFixed(2)} m²`);
      } else {
        linhaTotais.push('');
      }
    });
    dadosPDF.push(linhaTotais);
    const indiceLinhaTotais = dadosPDF.length - 1;

    // Configurar estilos da tabela
    const tableColumnStyles: any = {};
    colunasAtivasList.forEach((col, index) => {
      tableColumnStyles[index] = {
        cellWidth: col.key === 'notas' ? 60 : col.key === 'nome' ? 50 : 'auto',
      };
    });

    // Adicionar tabela ao PDF
    autoTable(doc, {
      head: [cabecalho],
      body: dadosPDF,
      startY: 20,
      styles: {
        font: 'helvetica',
        fontSize: 8,
        textColor: [203, 213, 225], // slate-300
        fillColor: [30, 41, 59], // slate-800
        lineColor: [71, 85, 105], // slate-600
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [30, 41, 59], // slate-800
        textColor: [226, 232, 240], // slate-200
        fontStyle: 'bold',
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [15, 23, 42], // slate-900
      },
      columnStyles: tableColumnStyles,
      didParseCell: (data: any) => {
        // Estilizar linhas de bairro e linha de totais
        const rowIndex = data.row.index;
        const isLinhaTotais = rowIndex === indiceLinhaTotais;
        
        if (indicesLinhasBairro.includes(rowIndex)) {
          data.cell.styles.fillColor = [14, 116, 144]; // cyan-700
          data.cell.styles.textColor = [103, 232, 249]; // cyan-300
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 10;
        } else if (isLinhaTotais) {
          data.cell.styles.fillColor = [14, 116, 144]; // cyan-700
          data.cell.styles.textColor = [103, 232, 249]; // cyan-300
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 11;
        }
        
        // Estilizar coluna de status (apenas para linhas de dados, não bairro nem totais)
        if (!indicesLinhasBairro.includes(rowIndex) && !isLinhaTotais) {
          const colIndex = data.column.index;
          const colKey = colunasAtivasList[colIndex]?.key;
          if (colKey === 'status' && data.cell.text[0] && data.cell.text[0] !== '-') {
            const status = data.cell.text[0];
            if (status === 'Concluído') {
              data.cell.styles.fillColor = [22, 101, 52]; // green-800
              data.cell.styles.textColor = [134, 239, 172]; // green-300
            } else if (status === 'Pendente') {
              data.cell.styles.fillColor = [133, 77, 14]; // yellow-800
              data.cell.styles.textColor = [253, 224, 71]; // yellow-300
            } else {
              data.cell.styles.fillColor = [153, 27, 27]; // red-800
              data.cell.styles.textColor = [252, 165, 165]; // red-300
            }
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { top: 20, right: 10, bottom: 20, left: 10 },
    });

    // Gerar nome do arquivo com data
    const dataAtual = new Date();
    const dataFormatada = dataAtual.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).replace(/\//g, '-');
    const nomeArquivo = `Relatorio_Rocadas_${dataFormatada}.pdf`;

    // Salvar PDF
    doc.save(nomeArquivo);
  };

  // Função para gerar PDF e retornar como blob
  const gerarPDFBlob = async (): Promise<Blob> => {
    const formatarData = (dataStr: string) => {
      const data = new Date(dataStr);
      return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const colunas = [
      { key: 'nome', label: 'Nome', ativa: colunasAtivas.nome },
      { key: 'areaRocada', label: 'Área de Roçada', ativa: colunasAtivas.areaRocada },
      { key: 'areaEfetiva', label: 'Área Efetivamente Roçada', ativa: colunasAtivas.areaEfetiva },
      { key: 'ultimoServico', label: 'Último Serviço', ativa: colunasAtivas.ultimoServico },
      { key: 'status', label: 'Status', ativa: colunasAtivas.status },
      { key: 'notas', label: 'Notas de Serviço', ativa: colunasAtivas.notas },
    ];

    const colunasAtivasList = colunas.filter(c => c.ativa);

    const doc = new jsPDF('landscape', 'mm', 'a4');

    const dadosPDF: any[][] = [];
    const indicesLinhasBairro: number[] = [];

    // Adicionar cabeçalho
    const cabecalho = colunasAtivasList.map(col => col.label);

    // Adicionar dados por bairro
    let linhaIndex = 0;
    bairrosOrdenados.forEach(([bairroId, { bairro, itens }]) => {
      // Adicionar linha de cabeçalho do bairro
      const linhaBairro: any[] = [];
      colunasAtivasList.forEach(col => {
        if (col.key === 'nome') {
          linhaBairro.push(bairro ? bairro.nome : 'Sem Bairro');
        } else if (col.key === 'notas') {
          linhaBairro.push(`(${itens.length} ${itens.length === 1 ? 'serviço' : 'serviços'})`);
        } else {
          linhaBairro.push('');
        }
      });
      dadosPDF.push(linhaBairro);
      indicesLinhasBairro.push(linhaIndex);
      linhaIndex++;

      // Adicionar itens (roçada + serviço) do bairro
      itens.forEach((item) => {
        const { rocada, servico } = item;
        const areaRocada = getAreaAtualizada(rocada);
        let areaEfetiva = 0;
        if (servico.statusServico === 'Concluído') {
          areaEfetiva = areaRocada;
        } else if (servico.statusServico === 'Pendente') {
          areaEfetiva = areaRocada * 0.5;
        }
        const statusAtual = statusAtualizadosLocal.get(rocada._id) || servico.statusServico;
        const notasAtual = notasAtualizadasLocal.get(rocada._id) || servico.notasServico || '';

        const linhaDados: any[] = [];
        colunasAtivasList.forEach(col => {
          if (col.key === 'nome') {
            linhaDados.push(getNomeAtualizado(rocada));
          } else if (col.key === 'areaRocada') {
            linhaDados.push(areaRocada > 0 ? `${areaRocada.toFixed(2)} m²` : '-');
          } else if (col.key === 'areaEfetiva') {
            linhaDados.push(areaEfetiva > 0 ? `${areaEfetiva.toFixed(2)} m²` : '-');
          } else if (col.key === 'ultimoServico') {
            linhaDados.push(formatarData(servico.dataDeServico));
          } else if (col.key === 'status') {
            linhaDados.push(statusAtual || '-');
          } else if (col.key === 'notas') {
            linhaDados.push(notasAtual || '-');
          }
        });
        dadosPDF.push(linhaDados);
        linhaIndex++;
      });

      // Adicionar linha em branco entre bairros
      dadosPDF.push(colunasAtivasList.map(() => ''));
      linhaIndex++;
    });

    // Calcular totais
    let totalAreaRocada = 0;
    let totalAreaEfetiva = 0;
    const rocadasUnicas = new Set<string>();
    bairrosOrdenados.forEach(([_, { itens }]) => {
      itens.forEach((item) => {
        const { rocada, servico } = item;
        // Contar área de roçada apenas uma vez por roçada
        if (!rocadasUnicas.has(rocada._id)) {
          totalAreaRocada += getAreaAtualizada(rocada);
          rocadasUnicas.add(rocada._id);
        }
        // Área efetiva baseada no serviço atual
        const areaRocada = getAreaAtualizada(rocada);
        if (servico.statusServico === 'Concluído') {
          totalAreaEfetiva += areaRocada;
        } else if (servico.statusServico === 'Pendente') {
          totalAreaEfetiva += areaRocada * 0.5;
        }
      });
    });

    // Adicionar linha de totais
    const linhaTotais: any[] = [];
    colunasAtivasList.forEach(col => {
      if (col.key === 'nome') {
        linhaTotais.push('TOTAIS');
      } else if (col.key === 'areaRocada') {
        linhaTotais.push(`${totalAreaRocada.toFixed(2)} m²`);
      } else if (col.key === 'areaEfetiva') {
        linhaTotais.push(`${totalAreaEfetiva.toFixed(2)} m²`);
      } else {
        linhaTotais.push('');
      }
    });
    dadosPDF.push(linhaTotais);
    const indiceLinhaTotais = dadosPDF.length - 1;

    // Configurar estilos da tabela
    const tableColumnStyles: any = {};
    colunasAtivasList.forEach((col, index) => {
      tableColumnStyles[index] = {
        cellWidth: col.key === 'notas' ? 60 : col.key === 'nome' ? 50 : 'auto',
      };
    });

    // Adicionar tabela ao PDF
    autoTable(doc, {
      head: [cabecalho],
      body: dadosPDF,
      startY: 20,
      styles: {
        font: 'helvetica',
        fontSize: 8,
        textColor: [203, 213, 225], // slate-300
        fillColor: [30, 41, 59], // slate-800
        lineColor: [71, 85, 105], // slate-600
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [30, 41, 59], // slate-800
        textColor: [226, 232, 240], // slate-200
        fontStyle: 'bold',
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [15, 23, 42], // slate-900
      },
      columnStyles: tableColumnStyles,
      didParseCell: (data: any) => {
        // Estilizar linhas de bairro e linha de totais
        const rowIndex = data.row.index;
        const isLinhaTotais = rowIndex === indiceLinhaTotais;
        
        if (indicesLinhasBairro.includes(rowIndex)) {
          data.cell.styles.fillColor = [14, 116, 144]; // cyan-700
          data.cell.styles.textColor = [103, 232, 249]; // cyan-300
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 10;
        } else if (isLinhaTotais) {
          data.cell.styles.fillColor = [14, 116, 144]; // cyan-700
          data.cell.styles.textColor = [103, 232, 249]; // cyan-300
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 11;
        }
        
        // Estilizar coluna de status (apenas para linhas de dados, não bairro nem totais)
        if (!indicesLinhasBairro.includes(rowIndex) && !isLinhaTotais) {
          const colIndex = data.column.index;
          const colKey = colunasAtivasList[colIndex]?.key;
          if (colKey === 'status' && data.cell.text[0] && data.cell.text[0] !== '-') {
            const status = data.cell.text[0];
            if (status === 'Concluído') {
              data.cell.styles.fillColor = [22, 101, 52]; // green-800
              data.cell.styles.textColor = [134, 239, 172]; // green-300
            } else if (status === 'Pendente') {
              data.cell.styles.fillColor = [133, 77, 14]; // yellow-800
              data.cell.styles.textColor = [253, 224, 71]; // yellow-300
            } else {
              data.cell.styles.fillColor = [153, 27, 27]; // red-800
              data.cell.styles.textColor = [252, 165, 165]; // red-300
            }
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { top: 20, right: 10, bottom: 20, left: 10 },
    });

    // Converter PDF para blob
    const pdfBlob = doc.output('blob');
    return pdfBlob;
  };

  // Função para gerar Excel e retornar como blob
  const gerarExcelBlob = async (): Promise<Blob> => {
    const formatarData = (dataStr: string) => {
      const data = new Date(dataStr);
      return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const colunas = [
      { key: 'nome', label: 'Nome', ativa: colunasAtivas.nome },
      { key: 'areaRocada', label: 'Área de Roçada', ativa: colunasAtivas.areaRocada },
      { key: 'areaEfetiva', label: 'Área Efetivamente Roçada', ativa: colunasAtivas.areaEfetiva },
      { key: 'ultimoServico', label: 'Último Serviço', ativa: colunasAtivas.ultimoServico },
      { key: 'status', label: 'Status', ativa: colunasAtivas.status },
      { key: 'notas', label: 'Notas de Serviço', ativa: colunasAtivas.notas },
    ];

    const colunasAtivasList = colunas.filter(c => c.ativa);

    const dadosExcel: any[] = [];
    const indicesBairros: number[] = [];
    const indicesLinhasDados: number[] = [];
    let linhaAtual = 1; // Começa em 1 porque linha 0 é o cabeçalho

    // Adicionar dados por bairro
    bairrosOrdenados.forEach(([bairroId, { bairro, itens }]) => {
      // Adicionar linha de cabeçalho do bairro
      const linhaBairro: any = {};
      colunasAtivasList.forEach(col => {
        if (col.key === 'nome') {
          linhaBairro[col.label] = bairro ? bairro.nome : 'Sem Bairro';
        } else if (col.key === 'notas') {
          linhaBairro[col.label] = `(${itens.length} ${itens.length === 1 ? 'serviço' : 'serviços'})`;
        } else {
          linhaBairro[col.label] = '';
        }
      });
      dadosExcel.push(linhaBairro);
      indicesBairros.push(linhaAtual);
      linhaAtual++;

      // Adicionar itens (roçada + serviço) do bairro
      itens.forEach((item) => {
        const { rocada, servico } = item;
        const areaRocada = getAreaAtualizada(rocada);
        let areaEfetiva = 0;
        if (servico.statusServico === 'Concluído') {
          areaEfetiva = areaRocada;
        } else if (servico.statusServico === 'Pendente') {
          areaEfetiva = areaRocada * 0.5;
        }
        const statusAtual = statusAtualizadosLocal.get(rocada._id) || servico.statusServico;
        const notasAtual = notasAtualizadasLocal.get(rocada._id) || servico.notasServico || '';

        const linhaDados: any = {};
        colunasAtivasList.forEach(col => {
          if (col.key === 'nome') {
            linhaDados[col.label] = getNomeAtualizado(rocada);
          } else if (col.key === 'areaRocada') {
            linhaDados[col.label] = areaRocada > 0 ? `${areaRocada.toFixed(2)} m²` : '-';
          } else if (col.key === 'areaEfetiva') {
            linhaDados[col.label] = areaEfetiva > 0 ? `${areaEfetiva.toFixed(2)} m²` : '-';
          } else if (col.key === 'ultimoServico') {
            linhaDados[col.label] = formatarData(servico.dataDeServico);
          } else if (col.key === 'status') {
            linhaDados[col.label] = statusAtual || '-';
          } else if (col.key === 'notas') {
            linhaDados[col.label] = notasAtual || '-';
          }
        });
        dadosExcel.push(linhaDados);
        indicesLinhasDados.push(linhaAtual);
        linhaAtual++;
      });

      // Adicionar linha em branco entre bairros
      linhaAtual++;
      const linhaVazia: any = {};
      colunasAtivasList.forEach(col => {
        linhaVazia[col.label] = '';
      });
      dadosExcel.push(linhaVazia);
    });

    // Calcular totais
    let totalAreaRocada = 0;
    let totalAreaEfetiva = 0;
    const rocadasUnicas = new Set<string>();
    bairrosOrdenados.forEach(([_, { itens }]) => {
      itens.forEach((item) => {
        const { rocada, servico } = item;
        // Contar área de roçada apenas uma vez por roçada
        if (!rocadasUnicas.has(rocada._id)) {
          totalAreaRocada += getAreaAtualizada(rocada);
          rocadasUnicas.add(rocada._id);
        }
        // Área efetiva baseada no serviço atual
        const areaRocada = getAreaAtualizada(rocada);
        if (servico.statusServico === 'Concluído') {
          totalAreaEfetiva += areaRocada;
        } else if (servico.statusServico === 'Pendente') {
          totalAreaEfetiva += areaRocada * 0.5;
        }
      });
    });

    // Adicionar linha de totais
    linhaAtual++;
    const linhaTotais: any = {};
    colunasAtivasList.forEach(col => {
      if (col.key === 'nome') {
        linhaTotais[col.label] = 'TOTAIS';
      } else if (col.key === 'areaRocada') {
        linhaTotais[col.label] = `${totalAreaRocada.toFixed(2)} m²`;
      } else if (col.key === 'areaEfetiva') {
        linhaTotais[col.label] = `${totalAreaEfetiva.toFixed(2)} m²`;
      } else {
        linhaTotais[col.label] = '';
      }
    });
    dadosExcel.push(linhaTotais);
    indicesLinhasDados.push(linhaAtual);

    // Criar workbook e worksheet
    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    
    // Definir larguras das colunas
    const largurasColunas: { [key: string]: number } = {
      A: 30, B: 20, C: 25, D: 20, E: 15, F: 50,
    };
    ws['!cols'] = colunasAtivasList.map((_, index) => {
      const letra = String.fromCharCode(65 + index);
      return { wch: largurasColunas[letra] || 15 };
    });

    // Estilos
    const estiloCabecalho = {
      fill: { fgColor: { rgb: '1e293b' } }, // slate-800
      font: { bold: true, color: { rgb: 'e2e8f0' }, sz: 11 }, // slate-200
      alignment: { horizontal: 'left', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '475569' } },
        bottom: { style: 'thin', color: { rgb: '475569' } },
        left: { style: 'thin', color: { rgb: '475569' } },
        right: { style: 'thin', color: { rgb: '475569' } },
      },
    };

    const estiloBairro = {
      fill: { fgColor: { rgb: '0e7490' } }, // cyan-700
      font: { bold: true, color: { rgb: '67e8f9' }, sz: 11 }, // cyan-300
      alignment: { horizontal: 'left', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '06b6d4' } },
        bottom: { style: 'thin', color: { rgb: '06b6d4' } },
        left: { style: 'thin', color: { rgb: '06b6d4' } },
        right: { style: 'thin', color: { rgb: '06b6d4' } },
      },
    };

    const estiloLinhaDados = {
      fill: { fgColor: { rgb: '1e293b' } }, // slate-800
      font: { color: { rgb: 'cbd5e1' }, sz: 10 }, // slate-300
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: '334155' } },
        bottom: { style: 'thin', color: { rgb: '334155' } },
        left: { style: 'thin', color: { rgb: '334155' } },
        right: { style: 'thin', color: { rgb: '334155' } },
      },
    };

    const estiloLinhaDadosAlternada = {
      fill: { fgColor: { rgb: '0f172a' } }, // slate-900
      font: { color: { rgb: 'cbd5e1' }, sz: 10 }, // slate-300
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: '334155' } },
        bottom: { style: 'thin', color: { rgb: '334155' } },
        left: { style: 'thin', color: { rgb: '334155' } },
        right: { style: 'thin', color: { rgb: '334155' } },
      },
    };

    // Gerar letras das colunas dinamicamente
    const letrasColunas = colunasAtivasList.map((_, index) => {
      return String.fromCharCode(65 + index);
    });

    // Aplicar estilos ao cabeçalho (linha 1)
    letrasColunas.forEach((col) => {
      const cell = ws[`${col}1`];
      if (cell) {
        ws[`${col}1`].s = estiloCabecalho;
      }
    });

    // Aplicar estilos às linhas de bairro
    indicesBairros.forEach((linha) => {
      letrasColunas.forEach((col) => {
        const cell = ws[`${col}${linha + 1}`];
        if (cell) {
          ws[`${col}${linha + 1}`].s = estiloBairro;
        }
      });
    });

    // Aplicar estilos às linhas de dados
    const linhaTotaisIndex = linhaAtual;
    indicesLinhasDados.forEach((linha, index) => {
      const isLinhaTotais = linha === linhaTotaisIndex;
      const estilo = isLinhaTotais 
        ? {
            fill: { fgColor: { rgb: '0e7490' } }, // cyan-700
            font: { bold: true, color: { rgb: '67e8f9' }, sz: 11 }, // cyan-300
            alignment: { horizontal: 'left', vertical: 'center' },
            border: {
              top: { style: 'medium', color: { rgb: '06b6d4' } },
              bottom: { style: 'medium', color: { rgb: '06b6d4' } },
              left: { style: 'thin', color: { rgb: '06b6d4' } },
              right: { style: 'thin', color: { rgb: '06b6d4' } },
            },
          }
        : index % 2 === 0 ? estiloLinhaDados : estiloLinhaDadosAlternada;
      
      letrasColunas.forEach((col, colIndex) => {
        const cell = ws[`${col}${linha + 1}`];
        if (cell) {
          const estiloCelula = { ...estilo };
          
          if (!isLinhaTotais) {
            const colunaAtual = colunasAtivasList[colIndex];
            if (colunaAtual && colunaAtual.key === 'status' && cell.v && cell.v !== '-') {
              if (cell.v === 'Concluído') {
                estiloCelula.fill = { fgColor: { rgb: '166534' } }; // green-800
                estiloCelula.font = { ...estiloCelula.font, color: { rgb: '86efac' } }; // green-300
              } else if (cell.v === 'Pendente') {
                estiloCelula.fill = { fgColor: { rgb: '854d0e' } }; // yellow-800
                estiloCelula.font = { ...estiloCelula.font, color: { rgb: 'fde047' } }; // yellow-300
              } else {
                estiloCelula.fill = { fgColor: { rgb: '991b1b' } }; // red-800
                estiloCelula.font = { ...estiloCelula.font, color: { rgb: 'fca5a5' } }; // red-300
              }
            }
          }
          
          ws[`${col}${linha + 1}`].s = estiloCelula;
        }
      });
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório de Roçadas');

    // Converter para blob
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };


  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Loading Screen */}
      {loading && <LoadingScreen />}

      {/* Header */}
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
                RM Manager - Relatórios
              </h1>
            </div>
            
            {/* Título Mobile */}
            <div className="md:hidden flex items-center gap-2">
              <h1 className="text-base font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Relatórios
              </h1>
            </div>

            {/* Navegação */}
            <nav className="flex items-center gap-2 sm:gap-3 ml-auto">
              <button
                className="p-2 sm:px-5 sm:py-2.5 border-2 border-slate-500 text-slate-400 font-medium rounded-lg bg-transparent hover:border-slate-400 hover:text-slate-300 active:scale-95 transition-all duration-200 ease-out hover:shadow-lg"
                onClick={() => router.push('/')}
                title="Voltar"
              >
                <svg className="w-5 h-5 sm:inline-block sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Voltar</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="pt-[73px] h-full overflow-y-auto">
        <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
          {/* Filtros de Data */}
          <div className="mb-4 sm:mb-6 p-4 sm:p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
            <h2 className="text-base sm:text-lg font-semibold text-slate-200 mb-3 sm:mb-4">Período de Análise</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Data Início
                </label>
                <input
                  type="datetime-local"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Data Fim
                </label>
                <input
                  type="datetime-local"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Filtros da Tabela */}
          <div className="mb-4 sm:mb-6 p-4 sm:p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
            <h2 className="text-base sm:text-lg font-semibold text-slate-200 mb-3 sm:mb-4">Filtros</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              {/* Filtro de Texto */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Buscar por Texto
                </label>
                <input
                  type="text"
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  placeholder="Digite para buscar..."
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                />
              </div>

              {/* Filtro de Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Filtrar por Status
                </label>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                >
                  <option value="Todos">Todos</option>
                  <option value="Concluído">Concluído</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Não Feito">Não Feito</option>
                </select>
              </div>

              {/* Filtro de Bairro */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Filtrar por Bairro
                </label>
                <select
                  value={filtroBairro}
                  onChange={(e) => setFiltroBairro(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                >
                  <option value="Todos">Todos</option>
                  <option value="sem-bairro">Sem Bairro</option>
                  {bairros.map((bairro) => (
                    <option key={bairro._id} value={bairro._id}>
                      {bairro.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[calc(100vh-350px)] sm:max-h-[calc(100vh-250px)] overflow-y-auto">
              <table className="w-full min-w-[768px]">
                <thead className="bg-slate-900/50 border-b border-slate-700 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={colunasAtivas.nome}
                          onChange={(e) => setColunasAtivas({ ...colunasAtivas, nome: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-0 focus:ring-offset-slate-900 cursor-pointer"
                        />
                        <span>Nome</span>
                      </div>
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={colunasAtivas.areaRocada}
                          onChange={(e) => setColunasAtivas({ ...colunasAtivas, areaRocada: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-0 focus:ring-offset-slate-900 cursor-pointer"
                        />
                        <span className="whitespace-nowrap">Área de Roçada</span>
                      </div>
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={colunasAtivas.areaEfetiva}
                          onChange={(e) => setColunasAtivas({ ...colunasAtivas, areaEfetiva: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-0 focus:ring-offset-slate-900 cursor-pointer"
                        />
                        <span className="whitespace-nowrap">Área Efetiva</span>
                      </div>
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={colunasAtivas.ultimoServico}
                          onChange={(e) => setColunasAtivas({ ...colunasAtivas, ultimoServico: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-0 focus:ring-offset-slate-900 cursor-pointer"
                        />
                        <span className="whitespace-nowrap">Último Serviço</span>
                      </div>
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={colunasAtivas.status}
                          onChange={(e) => setColunasAtivas({ ...colunasAtivas, status: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-0 focus:ring-offset-slate-900 cursor-pointer"
                        />
                        <span>Status</span>
                      </div>
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={colunasAtivas.notas}
                          onChange={(e) => setColunasAtivas({ ...colunasAtivas, notas: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-0 focus:ring-offset-slate-900 cursor-pointer"
                        />
                        <span className="whitespace-nowrap">Notas</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {bairrosOrdenados.length > 0 ? (
                    bairrosOrdenados.map(([bairroId, { bairro, itens }]) => {
                      const formatarData = (dataStr: string) => {
                        const data = new Date(dataStr);
                        return data.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                      };

                      const getStatusColor = (status: string) => {
                        if (status === 'Concluído') return 'bg-green-500/20 text-green-400 border-green-500/30';
                        if (status === 'Pendente') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
                        return 'bg-red-500/20 text-red-400 border-red-500/30';
                      };

                      return (
                        <Fragment key={bairroId}>
                          {/* Separador de Bairro */}
                          <tr className="bg-slate-900/70 border-t-2 border-b-2 border-cyan-500/30">
                            <td colSpan={6} className="px-3 sm:px-6 py-3 sm:py-4">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-cyan-400 to-cyan-600 rounded"></div>
                                <h3 className="text-base sm:text-xl font-bold text-cyan-400">
                                  {bairro ? bairro.nome : 'Sem Bairro'}
                                </h3>
                                <span className="text-sm sm:text-base text-slate-400">
                                  ({itens.length} {itens.length === 1 ? 'serviço' : 'serviços'})
                                </span>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Agrupar itens por roçada dentro do bairro */}
                          {(() => {
                            // Agrupar itens por roçada
                            const itensPorRocada = new Map<string, ItemTabela[]>();
                            itens.forEach((item) => {
                              const rocadaId = item.rocada._id;
                              if (!itensPorRocada.has(rocadaId)) {
                                itensPorRocada.set(rocadaId, []);
                              }
                              itensPorRocada.get(rocadaId)!.push(item);
                            });

                            // Converter para array e renderizar
                            const gruposRocadas = Array.from(itensPorRocada.entries());
                            
                            return gruposRocadas.map(([rocadaId, itensRocada]) => {
                              const primeiraRocada = itensRocada[0].rocada;
                              const areaRocada = getAreaAtualizada(primeiraRocada);
                              const quantidadeServicos = itensRocada.length;

                              return (
                                <Fragment key={rocadaId}>
                                  {itensRocada.map((item, servicoIndex) => {
                                    const { rocada, servico } = item;
                                    
                                    // Calcular área efetivamente roçada baseada no serviço atual
                                    let areaEfetiva = 0;
                                    
                                    if (servico.statusServico === 'Concluído') {
                                      areaEfetiva = areaRocada;
                                    } else if (servico.statusServico === 'Pendente') {
                                      areaEfetiva = areaRocada * 0.5;
                                    } else {
                                      areaEfetiva = 0;
                                    }

                                    const statusAtual = statusAtualizadosLocal.get(rocada._id) || servico.statusServico;
                                    const notasAtual = notasAtualizadasLocal.get(rocada._id) || servico.notasServico || '';

                                    return (
                                      <tr key={`${rocada._id}-${servico.dataDeServico}-${servicoIndex}`} className="hover:bg-slate-800/30 transition-colors">
                                        {/* Nome da roçada - apenas na primeira linha com rowSpan */}
                                        {servicoIndex === 0 && (
                                          <td rowSpan={quantidadeServicos} className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap align-middle">
                                            <div 
                                              className="text-xs sm:text-sm font-medium text-slate-200 cursor-pointer hover:text-cyan-400 transition-colors"
                                              onClick={() => {
                                                setRocadaEditando(rocada);
                                                setNomeEditando(getNomeAtualizado(rocada));
                                                setModalEditarNome(true);
                                              }}
                                            >
                                              {getNomeAtualizado(rocada)}
                                            </div>
                                          </td>
                                        )}
                                        {/* Área de Roçada - apenas na primeira linha com rowSpan */}
                                        {servicoIndex === 0 && (
                                          <td rowSpan={quantidadeServicos} className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap align-middle">
                                            <div 
                                              className="text-xs sm:text-sm text-slate-300 cursor-pointer hover:text-cyan-400 transition-colors"
                                              onClick={() => {
                                                setRocadaEditandoArea(rocada);
                                                setAreaEditando(areaRocada.toString());
                                                setModalEditarArea(true);
                                              }}
                                            >
                                              {areaRocada > 0 ? `${areaRocada.toFixed(2)} m²` : '-'}
                                            </div>
                                          </td>
                                        )}
                                        {/* Área Efetiva - específica de cada serviço */}
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                          <div 
                                            className="text-xs sm:text-sm text-slate-300 cursor-pointer hover:text-cyan-400 transition-colors"
                                            onClick={() => {
                                              setRocadaEditandoAreaEfetiva(rocada);
                                              setAreaEfetivaEditando(areaEfetiva.toString());
                                              setModalEditarAreaEfetiva(true);
                                            }}
                                          >
                                            {areaEfetiva > 0 ? `${areaEfetiva.toFixed(2)} m²` : '-'}
                                          </div>
                                        </td>
                                        {/* Último Serviço - específico de cada serviço */}
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                          <div 
                                            className="text-xs sm:text-sm text-slate-300 cursor-pointer hover:text-cyan-400 transition-colors"
                                            onClick={() => {
                                              setRocadaEditandoUltimoServico(rocada);
                                              setUltimoServicoEditando(servico.dataDeServico);
                                              setModalEditarUltimoServico(true);
                                            }}
                                          >
                                            {formatarData(servico.dataDeServico)}
                                          </div>
                                        </td>
                                        {/* Status - específico de cada serviço */}
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                          {statusAtual ? (
                                            <span 
                                              className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded text-xs font-semibold border ${getStatusColor(statusAtual)} cursor-pointer hover:opacity-80 transition-opacity`}
                                              onClick={() => {
                                                setRocadaEditandoStatus(rocada);
                                                setStatusEditando(statusAtual);
                                                setModalEditarStatus(true);
                                              }}
                                            >
                                              {statusAtual}
                                            </span>
                                          ) : (
                                            <span className="text-sm text-slate-500">-</span>
                                          )}
                                        </td>
                                        {/* Notas - específico de cada serviço */}
                                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                                          <div 
                                            className="text-xs sm:text-sm text-slate-300 max-w-[200px] sm:max-w-md cursor-pointer hover:text-cyan-400 transition-colors"
                                            onClick={() => {
                                              setRocadaEditandoNotas(rocada);
                                              setNotasEditando(notasAtual);
                                              setModalEditarNotas(true);
                                            }}
                                          >
                                            {notasAtual ? (
                                              <div className="whitespace-pre-wrap break-words">
                                                {notasAtual}
                                              </div>
                                            ) : (
                                              <span className="text-slate-500">-</span>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </Fragment>
                              );
                            });
                          })()}
                        </Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        Nenhuma roçada encontrada no período selecionado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totais */}
          <div className="mt-4 sm:mt-6 p-4 sm:p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 sm:p-4">
                <div className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Área Total de Roçada
                </div>
                <div className="text-xl sm:text-2xl font-bold text-cyan-400">
                  {(() => {
                    let total = 0;
                    const rocadasUnicas = new Set<string>();
                    bairrosOrdenados.forEach(([_, { itens }]) => {
                      itens.forEach((item) => {
                        if (!rocadasUnicas.has(item.rocada._id)) {
                          total += getAreaAtualizada(item.rocada);
                          rocadasUnicas.add(item.rocada._id);
                        }
                      });
                    });
                    return `${total.toFixed(2)} m²`;
                  })()}
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 sm:p-4">
                <div className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Área Total Efetivamente Roçada
                </div>
                <div className="text-xl sm:text-2xl font-bold text-cyan-400">
                  {(() => {
                    let total = 0;
                    bairrosOrdenados.forEach(([_, { itens }]) => {
                      itens.forEach((item) => {
                        const { rocada, servico } = item;
                        const areaRocada = getAreaAtualizada(rocada);
                        if (servico.statusServico === 'Concluído') {
                          total += areaRocada;
                        } else if (servico.statusServico === 'Pendente') {
                          total += areaRocada * 0.5;
                        }
                      });
                    });
                    return `${total.toFixed(2)} m²`;
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Botões de Exportar */}
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <button
              onClick={exportarParaPDF}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white font-medium rounded-lg shadow-lg hover:from-red-500 hover:to-rose-500 active:scale-95 transition-all duration-200 ease-out flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>Exportar para PDF</span>
            </button>
            <button
              onClick={exportarParaExcel}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg shadow-lg hover:from-green-500 hover:to-emerald-500 active:scale-95 transition-all duration-200 ease-out flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Exportar para Excel</span>
            </button>
          </div>

          {/* Tabela de Necessidade */}
          {config && (
            <div className="mt-6">
              <TabelaNecessidade 
                rocadas={rocadas} 
                bairros={bairros} 
                tempoRocagemPad={config.tempoRocagemPad} 
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal de Editar Nome */}
      {modalEditarNome && rocadaEditando && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
          {/* Overlay escuro */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setModalEditarNome(false)}
          ></div>
          
          {/* Modal */}
          <div className="relative z-10 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-md">
            <h2 className="text-lg sm:text-xl font-bold text-slate-200 mb-3 sm:mb-4">
              Editar Nome da Roçada
            </h2>
            
            <div className="mb-4 sm:mb-6">
              <label className="block text-xs sm:text-sm font-semibold text-slate-400 mb-2">
                Nome da Rua
              </label>
              <input
                type="text"
                value={nomeEditando}
                onChange={(e) => setNomeEditando(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                placeholder="Digite o nome da rua"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
              <button
                onClick={() => setModalEditarNome(false)}
                className="px-4 sm:px-5 py-2 sm:py-2.5 border-2 border-slate-600 text-slate-400 font-medium rounded-lg bg-transparent hover:border-slate-500 hover:text-slate-300 active:scale-95 transition-all duration-200 ease-out text-sm sm:text-base"
              >
                Cancelar
              </button>
              <button
                onClick={handleAtualizarNaTabela}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-lg shadow-lg hover:from-blue-500 hover:to-cyan-500 active:scale-95 transition-all duration-200 ease-out text-sm sm:text-base"
              >
                Atualizar na Tabela
              </button>
              <button
                onClick={handleAtualizarNoBanco}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg shadow-lg hover:from-green-500 hover:to-emerald-500 active:scale-95 transition-all duration-200 ease-out text-sm sm:text-base"
              >
                Atualizar no Banco
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Área */}
      {modalEditarArea && rocadaEditandoArea && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
          {/* Overlay escuro */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setModalEditarArea(false)}
          ></div>
          
          {/* Modal */}
          <div className="relative z-10 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-200 mb-4">
              Editar Área de Roçada
            </h2>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-400 mb-2">
                Área de Roçada (m²)
              </label>
              <input
                type="number"
                step="0.01"
                value={areaEditando}
                onChange={(e) => setAreaEditando(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                placeholder="Digite a área de roçada"
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModalEditarArea(false)}
                className="px-5 py-2.5 border-2 border-slate-600 text-slate-400 font-medium rounded-lg bg-transparent hover:border-slate-500 hover:text-slate-300 active:scale-95 transition-all duration-200 ease-out"
              >
                Cancelar
              </button>
              <button
                onClick={handleAtualizarAreaNaTabela}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-lg shadow-lg hover:from-blue-500 hover:to-cyan-500 active:scale-95 transition-all duration-200 ease-out"
              >
                Atualizar na Tabela
              </button>
              <button
                onClick={handleAtualizarAreaNoBanco}
                className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg shadow-lg hover:from-green-500 hover:to-emerald-500 active:scale-95 transition-all duration-200 ease-out"
              >
                Atualizar no Banco
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Área Efetivamente Roçada */}
      {modalEditarAreaEfetiva && rocadaEditandoAreaEfetiva && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
          {/* Overlay escuro */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setModalEditarAreaEfetiva(false)}
          ></div>
          
          {/* Modal */}
          <div className="relative z-10 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-200 mb-4">
              Editar Área Efetivamente Roçada
            </h2>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-400 mb-2">
                Área Efetivamente Roçada (m²)
              </label>
              <input
                type="number"
                step="0.01"
                value={areaEfetivaEditando}
                onChange={(e) => setAreaEfetivaEditando(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                placeholder="Digite a área efetivamente roçada"
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModalEditarAreaEfetiva(false)}
                className="px-5 py-2.5 border-2 border-slate-600 text-slate-400 font-medium rounded-lg bg-transparent hover:border-slate-500 hover:text-slate-300 active:scale-95 transition-all duration-200 ease-out"
              >
                Cancelar
              </button>
              <button
                onClick={handleAtualizarAreaEfetivaNaTabela}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-lg shadow-lg hover:from-blue-500 hover:to-cyan-500 active:scale-95 transition-all duration-200 ease-out"
              >
                Atualizar na Tabela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Último Serviço */}
      {modalEditarUltimoServico && rocadaEditandoUltimoServico && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setModalEditarUltimoServico(false)}
          ></div>
          <div className="relative z-10 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-200 mb-4">Editar Último Serviço</h2>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-400 mb-2">
                Data e Hora do Serviço
              </label>
              <input
                type="datetime-local"
                value={ultimoServicoEditando}
                onChange={(e) => setUltimoServicoEditando(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModalEditarUltimoServico(false)}
                className="px-5 py-2.5 border-2 border-slate-600 text-slate-400 font-medium rounded-lg bg-transparent hover:border-slate-500 hover:text-slate-300 active:scale-95 transition-all duration-200 ease-out"
              >
                Cancelar
              </button>
              <button
                onClick={handleAtualizarUltimoServicoNaTabela}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-lg shadow-lg hover:from-blue-500 hover:to-cyan-500 active:scale-95 transition-all duration-200 ease-out"
              >
                Atualizar na Tabela
              </button>
              <button
                onClick={handleAtualizarUltimoServicoNoBanco}
                className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg shadow-lg hover:from-green-500 hover:to-emerald-500 active:scale-95 transition-all duration-200 ease-out"
              >
                Atualizar no Banco
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Status */}
      {modalEditarStatus && rocadaEditandoStatus && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setModalEditarStatus(false)}
          ></div>
          <div className="relative z-10 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-200 mb-4">Editar Status</h2>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-400 mb-2">
                Status do Serviço
              </label>
              <select
                value={statusEditando}
                onChange={(e) => setStatusEditando(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              >
                <option value="Concluído">Concluído</option>
                <option value="Pendente">Pendente</option>
                <option value="Não Feito">Não Feito</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModalEditarStatus(false)}
                className="px-5 py-2.5 border-2 border-slate-600 text-slate-400 font-medium rounded-lg bg-transparent hover:border-slate-500 hover:text-slate-300 active:scale-95 transition-all duration-200 ease-out"
              >
                Cancelar
              </button>
              <button
                onClick={handleAtualizarStatusNaTabela}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-lg shadow-lg hover:from-blue-500 hover:to-cyan-500 active:scale-95 transition-all duration-200 ease-out"
              >
                Atualizar na Tabela
              </button>
              <button
                onClick={handleAtualizarStatusNoBanco}
                className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg shadow-lg hover:from-green-500 hover:to-emerald-500 active:scale-95 transition-all duration-200 ease-out"
              >
                Atualizar no Banco
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Notas */}
      {modalEditarNotas && rocadaEditandoNotas && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setModalEditarNotas(false)}
          ></div>
          <div className="relative z-10 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-200 mb-4">Editar Notas de Serviço</h2>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-400 mb-2">
                Notas do Serviço
              </label>
              <textarea
                value={notasEditando}
                onChange={(e) => setNotasEditando(e.target.value)}
                rows={6}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all resize-none"
                placeholder="Digite as notas do serviço"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModalEditarNotas(false)}
                className="px-5 py-2.5 border-2 border-slate-600 text-slate-400 font-medium rounded-lg bg-transparent hover:border-slate-500 hover:text-slate-300 active:scale-95 transition-all duration-200 ease-out"
              >
                Cancelar
              </button>
              <button
                onClick={handleAtualizarNotasNaTabela}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-lg shadow-lg hover:from-blue-500 hover:to-cyan-500 active:scale-95 transition-all duration-200 ease-out"
              >
                Atualizar na Tabela
              </button>
              <button
                onClick={handleAtualizarNotasNoBanco}
                className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg shadow-lg hover:from-green-500 hover:to-emerald-500 active:scale-95 transition-all duration-200 ease-out"
              >
                Atualizar no Banco
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
