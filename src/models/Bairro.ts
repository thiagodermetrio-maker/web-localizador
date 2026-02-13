import mongoose, { Schema, Document } from 'mongoose';

interface BairroDocument extends Document {
  nome: string;
  ruas: string[]; // Lista de IDs dos objetos rocada
}

const BairroSchema = new Schema<BairroDocument>({
  nome: { type: String, required: true },
  ruas: [{ type: String, required: true }],
}, {
  timestamps: true,
});

const Bairro = mongoose.models.Bairro || mongoose.model<BairroDocument>('Bairro', BairroSchema, 'bairros');

export default Bairro;
export type { BairroDocument };
