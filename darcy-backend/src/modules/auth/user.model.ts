import {
  Table, Column, Model, DataType, HasOne, HasMany, BeforeCreate, BeforeUpdate,
} from 'sequelize-typescript';
import bcrypt from 'bcryptjs';
import { Client } from '../client/client.model';
import { RefreshToken } from '../auth/refreshToken.model';

@Table({ tableName: 'users', timestamps: true, underscored: true })
export class User extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  name!: string;

  @Column({ type: DataType.STRING(255), allowNull: false, unique: true })
  email!: string;

  @Column({ type: DataType.STRING(50), unique: true, allowNull: true })
  username!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  password!: string;

  @Column({
    type: DataType.ENUM('client', 'admin', 'super_admin'),
    defaultValue: 'client',
  })
  role!: 'client' | 'admin' | 'super_admin';

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  isActive!: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  twoFactorEnabled!: boolean;

  @Column({ type: DataType.STRING(10), allowNull: true })
  twoFactorSecret!: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  passwordResetToken!: string;

  @Column({ type: DataType.DATE, allowNull: true })
  passwordResetExpires!: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  lastLogin!: Date;

  @HasOne(() => Client)
  client!: Client;

  @HasMany(() => RefreshToken)
  refreshTokens!: RefreshToken[];

  @BeforeCreate
  @BeforeUpdate
  static async hashPassword(user: User) {
    if (user.changed('password')) {
      user.password = await bcrypt.hash(user.password, 12);
    }
  }

  async comparePassword(plainText: string): Promise<boolean> {
    return bcrypt.compare(plainText, this.password);
  }

  toSafeJSON() {
    const { password, twoFactorSecret, passwordResetToken, ...safe } = this.toJSON() as any;
    return safe;
  }
}

export default User;
