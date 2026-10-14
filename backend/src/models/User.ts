import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  pin?: string; // Hashed 4-6 digit cashier PIN
  role: UserRole;
  storeId?: mongoose.Types.ObjectId;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
  comparePin(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true },
    pin: { type: String, default: undefined },
    role: {
      type: String,
      enum: ['ADMIN', 'MANAGER', 'CASHIER'],
      default: 'CASHIER',
      required: true,
      index: true,
    },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', default: null },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Password & PIN hashing hooks
UserSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  if (this.isModified('pin') && this.pin) {
    const salt = await bcrypt.genSalt(10);
    this.pin = await bcrypt.hash(this.pin, salt);
  }
  next();
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.comparePin = async function (candidate: string): Promise<boolean> {
  if (!this.pin) return false;
  return bcrypt.compare(candidate, this.pin);
};

export const User = mongoose.model<IUser>('User', UserSchema);
