'use client';

import { useMemo, useState, Fragment } from 'react';
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
  perimetroRocada?: number;
  listaServicos?: Servico[];
  tipo?: 'rua' | 'area';
  tempoCortePersonalizado?: number | null;
}

interface Bairro {
  _id: string;
  nome: string;
  ruas: string[];
}

interface TabelaNecessidadeProps {
  rocadas: Rocada[];
  bairros: Bairro[];
  tempoRocagemPad: number;
}

export default function TabelaNecessidade({ rocadas, bairros, tempoRocagemPad }: TabelaNecessidadeProps) {
  const [filtroNecessidade, setFiltroNecessidade] = useState<number>(50);

  // Função para obter o último serviço
  const getUltimoServico = (rocada: Rocada): Servico | null => {
    if (!rocada.listaServicos || rocada.listaServicos.length === 0) {
      return null;
    }
    
    const servicosOrdenados = [...rocada.listaServicos].sort((a, b) => {
      return new Date(b.dataDeServico).getTime() - new Date(a.dataDeServico).getTime();
    });
    
    return servicosOrdenados[0];
  };

  // Função para calcular a necessidade de corte
  const calcularNecessidade = (rocada: Rocada): number => {
    const ultimoServico = getUltimoServico(rocada);
    if (!ultimoServico) {
      return 100; // Se não há serviços, 100% de necessidade
    }

    // Se o último serviço tem status "Pendente", considerar alta necessidade
    if (ultimoServico.statusServico === 'Pendente') {
      return 100;
    }

    const tempoCorte = rocada.tempoCortePersonalizado ?? tempoRocagemPad;
    const dataUltimoServico = new Date(ultimoServico.dataDeServico);
    const hoje = new Date();
    const diasDesdeUltimoServico = Math.floor((hoje.getTime() - dataUltimoServico.getTime()) / (1000 * 60 * 60 * 24));

    // Se acabou de ser cortado (0 dias), retorna 0%
    if (diasDesdeUltimoServico <= 0) {
      return 0;
    }

    // Se faz tempoCorte ou mais, retorna 100%
    if (diasDesdeUltimoServico >= tempoCorte) {
      return 100;
    }

    // Progressão linear entre 0 e tempoCorte
    const porcentagem = (diasDesdeUltimoServico / tempoCorte) * 100;
    return Math.min(100, Math.max(0, Math.round(porcentagem)));
  };

  // Função para formatar data
  const formatarData = (dataStr: string): string => {
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Função para obter cor baseada na necessidade
  const getNecessidadeColor = (necessidade: number): string => {
    if (necessidade <= 20) return 'text-green-400';
    if (necessidade <= 40) return 'text-green-300';
    if (necessidade <= 60) return 'text-yellow-400';
    if (necessidade <= 80) return 'text-orange-400';
    return 'text-red-400';
  };

  // Função para obter cor de fundo baseada na necessidade
  const getNecessidadeBgColor = (necessidade: number): string => {
    if (necessidade <= 20) return 'bg-green-500/20 border-green-500/30';
    if (necessidade <= 40) return 'bg-green-500/20 border-green-500/30';
    if (necessidade <= 60) return 'bg-yellow-500/20 border-yellow-500/30';
    if (necessidade <= 80) return 'bg-orange-500/20 border-orange-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  // Calcular necessidade para cada roçada, ordenar e agrupar por bairro
  const rocadasPorBairro = useMemo(() => {
    const todasRocadas = rocadas.map((rocada) => {
      const necessidade = calcularNecessidade(rocada);
      const ultimoServico = getUltimoServico(rocada);
      const bairro = bairros.find((b) => b.ruas.includes(rocada._id));
      
      return {
        ...rocada,
        necessidade,
        ultimoServico,
        bairro: bairro || null,
      };
    }).sort((a, b) => {
      // Ordenar por necessidade (maior primeiro)
      if (b.necessidade !== a.necessidade) {
        return b.necessidade - a.necessidade;
      }
      // Se a necessidade for igual, ordenar por data do último serviço (mais antigo primeiro)
      if (a.ultimoServico && b.ultimoServico) {
        return new Date(a.ultimoServico.dataDeServico).getTime() - new Date(b.ultimoServico.dataDeServico).getTime();
      }
      if (!a.ultimoServico) return 1;
      if (!b.ultimoServico) return -1;
      return 0;
    });

    // Filtrar por necessidade mínima baseado no slider
    const rocadasFiltradas = todasRocadas.filter((item) => item.necessidade >= filtroNecessidade);

    // Agrupar roçadas por bairro
    const rocadasAgrupadas: { [key: string]: { bairro: Bairro | null; rocadas: typeof rocadasFiltradas } } = {};
    
    // Inicializar com "Sem Bairro"
    rocadasAgrupadas['sem-bairro'] = { bairro: null, rocadas: [] };

    // Adicionar bairros
    bairros.forEach((bairro) => {
      rocadasAgrupadas[bairro._id] = { bairro, rocadas: [] };
    });

    // Distribuir roçadas pelos bairros
    rocadasFiltradas.forEach((rocada) => {
      if (rocada.bairro) {
        rocadasAgrupadas[rocada.bairro._id].rocadas.push(rocada);
      } else {
        rocadasAgrupadas['sem-bairro'].rocadas.push(rocada);
      }
    });

    // Ordenar bairros: primeiro os com roçadas, depois "Sem Bairro" por último
    const bairrosOrdenados = Object.entries(rocadasAgrupadas)
      .filter(([_, data]) => data.rocadas.length > 0)
      .sort(([keyA, dataA], [keyB, dataB]) => {
        if (keyA === 'sem-bairro') return 1;
        if (keyB === 'sem-bairro') return -1;
        if (dataA.bairro && dataB.bairro) {
          return dataA.bairro.nome.localeCompare(dataB.bairro.nome);
        }
        return 0;
      });

    return bairrosOrdenados;
  }, [rocadas, bairros, tempoRocagemPad, filtroNecessidade]);

  // Função para exportar para PDF
  const exportarParaPDF = () => {
    const dadosPDF: any[][] = [];
    const indicesLinhasBairro: number[] = [];
    
    // Adicionar cabeçalho
    const cabecalho = ['Nome', 'Área de Roçada', 'Último Serviço', 'Status', 'Necessidade de Corte'];

    // Adicionar dados por bairro
    let linhaIndex = 0;
    rocadasPorBairro.forEach(([bairroId, { bairro, rocadas }]) => {
      // Adicionar linha de cabeçalho do bairro
      const linhaBairro: any[] = [];
      linhaBairro.push(bairro ? bairro.nome : 'Sem Bairro');
      linhaBairro.push(`(${rocadas.length} ${rocadas.length === 1 ? 'roçada' : 'roçadas'})`);
      linhaBairro.push('');
      linhaBairro.push('');
      linhaBairro.push('');
      dadosPDF.push(linhaBairro);
      indicesLinhasBairro.push(linhaIndex);
      linhaIndex++;

      // Adicionar roçadas do bairro
      rocadas.forEach((rocada) => {
        const ultimoServico = rocada.ultimoServico;
        const linhaDados: any[] = [];
        
        linhaDados.push(rocada.nomeDaRua);
        linhaDados.push(rocada.perimetroRocada ? `${rocada.perimetroRocada.toFixed(2)} m²` : '-');
        linhaDados.push(ultimoServico ? formatarData(ultimoServico.dataDeServico) : 'Nenhum serviço');
        linhaDados.push(ultimoServico ? ultimoServico.statusServico : '-');
        linhaDados.push(`${rocada.necessidade}%`);
        
        dadosPDF.push(linhaDados);
        linhaIndex++;
      });

      // Adicionar linha em branco entre bairros
      dadosPDF.push(['', '', '', '', '']);
      linhaIndex++;
    });

    // Criar novo documento PDF
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // Configurar estilos da tabela
    const tableColumnStyles: any = {
      0: { cellWidth: 60 },
      1: { cellWidth: 30 },
      2: { cellWidth: 40 },
      3: { cellWidth: 25 },
      4: { cellWidth: 35 },
    };

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
        const rowIndex = data.row.index;
        
        // Estilizar linhas de bairro
        if (indicesLinhasBairro.includes(rowIndex)) {
          data.cell.styles.fillColor = [14, 116, 144]; // cyan-700
          data.cell.styles.textColor = [103, 232, 249]; // cyan-300
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 10;
        }
        
        // Estilizar coluna de status (apenas para linhas de dados, não bairro)
        if (!indicesLinhasBairro.includes(rowIndex) && data.cell.text[0] && data.cell.text[0] !== '' && data.cell.text[0] !== '-') {
          const colIndex = data.column.index;
          if (colIndex === 3) { // Coluna de Status
            const status = data.cell.text[0];
            if (status === 'Concluído') {
              data.cell.styles.fillColor = [22, 101, 52]; // green-800
              data.cell.styles.textColor = [134, 239, 172]; // green-300
            } else if (status === 'Pendente') {
              data.cell.styles.fillColor = [133, 77, 14]; // yellow-800
              data.cell.styles.textColor = [253, 224, 71]; // yellow-300
            } else if (status === 'Não Feito') {
              data.cell.styles.fillColor = [153, 27, 27]; // red-800
              data.cell.styles.textColor = [252, 165, 165]; // red-300
            }
            data.cell.styles.fontStyle = 'bold';
          }
          
          // Estilizar coluna de necessidade (última coluna)
          if (colIndex === 4 && data.cell.text[0] && data.cell.text[0] !== '') {
            const necessidadeStr = data.cell.text[0].replace('%', '');
            const necessidade = parseInt(necessidadeStr);
            if (necessidade <= 20) {
              data.cell.styles.fillColor = [22, 101, 52]; // green-800
              data.cell.styles.textColor = [134, 239, 172]; // green-300
            } else if (necessidade <= 40) {
              data.cell.styles.fillColor = [22, 101, 52]; // green-800
              data.cell.styles.textColor = [187, 247, 208]; // green-200
            } else if (necessidade <= 60) {
              data.cell.styles.fillColor = [133, 77, 14]; // yellow-800
              data.cell.styles.textColor = [253, 224, 71]; // yellow-300
            } else if (necessidade <= 80) {
              data.cell.styles.fillColor = [154, 52, 18]; // orange-800
              data.cell.styles.textColor = [253, 186, 116]; // orange-300
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
    const nomeArquivo = `Tabela_Necessidade_${dataFormatada}.pdf`;

    // Salvar PDF
    doc.save(nomeArquivo);
  };

  // Função para exportar para Excel
  const exportarParaExcel = () => {
    const dadosExcel: any[] = [];
    const indicesBairros: number[] = [];
    const indicesLinhasDados: number[] = [];

    // Adicionar cabeçalho
    const cabecalho: any = {
      'Nome': 'Nome',
      'Área de Roçada': 'Área de Roçada',
      'Último Serviço': 'Último Serviço',
      'Status': 'Status',
      'Necessidade de Corte': 'Necessidade de Corte',
    };
    dadosExcel.push(cabecalho);

    let linhaAtual = 1; // Começa em 1 porque linha 0 é o cabeçalho

    rocadasPorBairro.forEach(([bairroId, { bairro, rocadas }]) => {
      linhaAtual++;
      indicesBairros.push(linhaAtual);
      
      // Adicionar linha de cabeçalho do bairro
      const linhaBairro: any = {
        'Nome': bairro ? bairro.nome : 'Sem Bairro',
        'Área de Roçada': `(${rocadas.length} ${rocadas.length === 1 ? 'roçada' : 'roçadas'})`,
        'Último Serviço': '',
        'Status': '',
        'Necessidade de Corte': '',
      };
      dadosExcel.push(linhaBairro);

      // Adicionar roçadas do bairro
      rocadas.forEach((rocada) => {
        linhaAtual++;
        indicesLinhasDados.push(linhaAtual);
        
        const ultimoServico = rocada.ultimoServico;
        const linhaDados: any = {
          'Nome': rocada.nomeDaRua,
          'Área de Roçada': rocada.perimetroRocada ? `${rocada.perimetroRocada.toFixed(2)} m²` : '-',
          'Último Serviço': ultimoServico ? formatarData(ultimoServico.dataDeServico) : 'Nenhum serviço',
          'Status': ultimoServico ? ultimoServico.statusServico : '-',
          'Necessidade de Corte': `${rocada.necessidade}%`,
        };
        dadosExcel.push(linhaDados);
      });

      // Adicionar linha em branco entre bairros
      linhaAtual++;
      const linhaVazia: any = {
        'Nome': '',
        'Área de Roçada': '',
        'Último Serviço': '',
        'Status': '',
        'Necessidade de Corte': '',
      };
      dadosExcel.push(linhaVazia);
    });

    // Criar workbook e worksheet
    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    
    // Definir larguras das colunas
    ws['!cols'] = [
      { wch: 30 }, // Nome
      { wch: 18 }, // Área de Roçada
      { wch: 20 }, // Último Serviço
      { wch: 12 }, // Status
      { wch: 18 }, // Necessidade de Corte
    ];

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

    // Gerar letras das colunas
    const letrasColunas = ['A', 'B', 'C', 'D', 'E'];

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
    indicesLinhasDados.forEach((linha, index) => {
      const estilo = index % 2 === 0 ? estiloLinhaDados : estiloLinhaDadosAlternada;
      
      letrasColunas.forEach((col, colIndex) => {
        const cell = ws[`${col}${linha + 1}`];
        if (cell) {
          const estiloCelula = { ...estilo };
          
          // Estilizar coluna de Status
          if (colIndex === 3 && cell.v && cell.v !== '-') {
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
          
          // Estilizar coluna de Necessidade de Corte
          if (colIndex === 4 && cell.v && cell.v !== '') {
            const necessidadeStr = String(cell.v).replace('%', '');
            const necessidade = parseInt(necessidadeStr);
            if (necessidade <= 20) {
              estiloCelula.fill = { fgColor: { rgb: '166534' } }; // green-800
              estiloCelula.font = { sz: 10, color: { rgb: '86efac' }, bold: true } as any; // green-300
            } else if (necessidade <= 40) {
              estiloCelula.fill = { fgColor: { rgb: '166534' } }; // green-800
              estiloCelula.font = { sz: 10, color: { rgb: 'bbf7d0' }, bold: true } as any; // green-200
            } else if (necessidade <= 60) {
              estiloCelula.fill = { fgColor: { rgb: '854d0e' } }; // yellow-800
              estiloCelula.font = { sz: 10, color: { rgb: 'fde047' }, bold: true } as any; // yellow-300
            } else if (necessidade <= 80) {
              estiloCelula.fill = { fgColor: { rgb: '9a3412' } }; // orange-800
              estiloCelula.font = { sz: 10, color: { rgb: 'fdba74' }, bold: true } as any; // orange-300
            } else {
              estiloCelula.fill = { fgColor: { rgb: '991b1b' } }; // red-800
              estiloCelula.font = { sz: 10, color: { rgb: 'fca5a5' }, bold: true } as any; // red-300
            }
          }
          
          ws[`${col}${linha + 1}`].s = estiloCelula;
        }
      });
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tabela de Necessidade');

    // Gerar nome do arquivo com data
    const dataAtual = new Date();
    const dataFormatada = dataAtual.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).replace(/\//g, '-');
    const nomeArquivo = `Tabela_Necessidade_${dataFormatada}.xlsx`;

    // Fazer download
    XLSX.writeFile(wb, nomeArquivo);
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-slate-700">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-200">Tabela de Necessidade de Corte</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Ordenado por maior necessidade de manutenção</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 w-full lg:w-auto lg:min-w-[200px]">
            <span className="text-xs sm:text-sm text-slate-400 whitespace-nowrap">Min: {filtroNecessidade}%</span>
            <input
              type="range"
              min="0"
              max="100"
              value={filtroNecessidade}
              onChange={(e) => setFiltroNecessidade(Number(e.target.value))}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${filtroNecessidade}%, #475569 ${filtroNecessidade}%, #475569 100%)`
              }}
            />
            <span className="text-xs sm:text-sm text-slate-400 whitespace-nowrap">Max: 100%</span>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto max-h-[calc(100vh-500px)] sm:max-h-[calc(100vh-400px)] overflow-y-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-slate-900/50 border-b border-slate-700 sticky top-0 z-10">
            <tr>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span className="hidden sm:inline">Área de Roçada</span>
                <span className="sm:hidden">Área</span>
              </th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span className="hidden sm:inline">Último Serviço</span>
                <span className="sm:hidden">Serviço</span>
              </th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span className="hidden sm:inline">Necessidade</span>
                <span className="sm:hidden">%</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {rocadasPorBairro.length > 0 ? (
              rocadasPorBairro.map(([bairroId, { bairro, rocadas }]) => {
                const getStatusColor = (status: string) => {
                  if (status === 'Concluído') return 'bg-green-500/20 text-green-400 border-green-500/30';
                  if (status === 'Pendente') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
                  return 'bg-red-500/20 text-red-400 border-red-500/30';
                };

                return (
                  <Fragment key={bairroId}>
                    {/* Separador de Bairro */}
                    <tr className="bg-slate-900/70 border-t-2 border-b-2 border-cyan-500/30">
                      <td colSpan={5} className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-cyan-400 to-cyan-600 rounded"></div>
                          <h3 className="text-base sm:text-xl font-bold text-cyan-400">
                            {bairro ? bairro.nome : 'Sem Bairro'}
                          </h3>
                          <span className="text-sm sm:text-base text-slate-400">
                            ({rocadas.length} {rocadas.length === 1 ? 'roçada' : 'roçadas'})
                          </span>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Roçadas do Bairro */}
                    {rocadas.map((item) => {
                      const necessidade = item.necessidade;
                      const ultimoServico = item.ultimoServico;

                      return (
                        <tr key={item._id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="text-xs sm:text-sm font-medium text-slate-200">
                              {item.nomeDaRua}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {item.tipo === 'area' ? 'Área' : 'Rua'}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="text-xs sm:text-sm text-slate-300">
                              {item.perimetroRocada ? `${item.perimetroRocada.toFixed(2)} m²` : '-'}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="text-xs sm:text-sm text-slate-300">
                              {ultimoServico ? formatarData(ultimoServico.dataDeServico) : 'Nenhum serviço'}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            {ultimoServico ? (
                              <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded text-xs font-semibold border ${getStatusColor(ultimoServico.statusServico)}`}>
                                {ultimoServico.statusServico}
                              </span>
                            ) : (
                              <span className="text-xs sm:text-sm text-slate-500">-</span>
                            )}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold border ${getNecessidadeBgColor(necessidade)} ${getNecessidadeColor(necessidade)}`}>
                              {necessidade}%
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-3 sm:px-6 py-6 sm:py-8 text-center text-slate-500 text-sm">
                  Nenhuma roçada encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Botões de Exportar */}
      <div className="p-4 sm:p-6 border-t border-slate-700 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
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
    </div>
  );
}
