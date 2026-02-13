import mongoose, { Schema, Document } from 'mongoose';

interface Coordenada {
  dataHorario: string;
  coordenada: {
    lat: number;
    lng: number;
  };
}

interface LocalizadorUsuarioDocument extends Document {
  nomeUsuario: string;
  listaCoordenadas: Coordenada[];
}

const CoordenadaSchema = new Schema<Coordenada>({
  dataHorario: { type: String, required: true },
  coordenada: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
}, { _id: false });

const LocalizadorUsuarioSchema = new Schema<LocalizadorUsuarioDocument>({
  nomeUsuario: { type: String, required: true, unique: true },
  listaCoordenadas: { type: [CoordenadaSchema], default: [] },
}, {
  timestamps: true,
});

const LocalizadorUsuario = mongoose.models.LocalizadorUsuario || 
  mongoose.model<LocalizadorUsuarioDocument>('LocalizadorUsuario', LocalizadorUsuarioSchema, 'localizadorUsuario');

export default LocalizadorUsuario;
export type { LocalizadorUsuarioDocument, Coordenada };
