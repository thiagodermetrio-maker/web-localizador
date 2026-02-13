import mongoose, { Schema, Document } from 'mongoose';

interface Servico {
  dataDeServico: string;
  notasServico: string;
  statusServico: 'Concluído' | 'Pendente' | 'Não Feito';
}

interface RocadaDocument extends Document {
  coordenadasRua: Array<{ lat: number; lng: number }>;
  nomeDaRua: string;
  dataCadastro: string;
  comprimento: number;
  perimetroRocada: number;
  listaServicos: Servico[];
  notasSobreRua: string;
  tempoCortePersonalizado: number | null;
  tipo: 'rua' | 'area';
}

const ServicoSchema = new Schema<Servico>({
  dataDeServico: { type: String, required: true },
  notasServico: { type: String, required: true },
  statusServico: { type: String, enum: ['Concluído', 'Pendente', 'Não Feito'], required: true },
}, { _id: false });

const CoordenadaSchema = new Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
}, { _id: false });

const RocadaSchema = new Schema<RocadaDocument>({
  coordenadasRua: { type: [CoordenadaSchema], required: true },
  nomeDaRua: { type: String, required: true },
  dataCadastro: { type: String, required: true },
  comprimento: { type: Number, required: true },
  perimetroRocada: { type: Number, required: true },
  listaServicos: { type: [ServicoSchema], required: true },
  notasSobreRua: { type: String, default: '' },
  tempoCortePersonalizado: { type: Number, default: null },
  tipo: { type: String, enum: ['rua', 'area'], required: true },
}, {
  timestamps: true,
});

const Rocada = mongoose.models.Rocada || mongoose.model<RocadaDocument>('Rocada', RocadaSchema, 'rocada');

export default Rocada;
export type { RocadaDocument, Servico };
