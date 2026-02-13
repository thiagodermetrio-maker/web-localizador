import mongoose, { Schema, Document } from 'mongoose';

interface UsuarioDocument extends Document {
  usuario: string;
  senha: string;
}

const UsuarioSchema = new Schema<UsuarioDocument>({
  usuario: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
}, {
  timestamps: true,
});

const Usuario = mongoose.models.Usuario || mongoose.model<UsuarioDocument>('Usuario', UsuarioSchema, 'usuarios');

export default Usuario;
export type { UsuarioDocument };
