import mongoose, { Schema, Document } from 'mongoose';

interface ConfigDocument extends Document {
  tempoRocagemPad: number;
  tempoRelPad: number;
}

const ConfigSchema = new Schema<ConfigDocument>({
  tempoRocagemPad: { type: Number, required: true, default: 60 },
  tempoRelPad: { type: Number, required: true, default: 30 },
}, {
  timestamps: true,
});

const Config = mongoose.models.Config || mongoose.model<ConfigDocument>('Config', ConfigSchema, 'config');

export default Config;
export type { ConfigDocument };
