import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';

@Table({ tableName: 'refresh_tokens', timestamps: true, underscored: true })
export class RefreshToken extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  token!: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  userId!: string;

  @Column({ type: DataType.DATE, allowNull: false })
  expiresAt!: Date;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  isRevoked!: boolean;

  @Column({ type: DataType.STRING(45), allowNull: true })
  ipAddress!: string;

  @BelongsTo(() => User)
  user!: User;
}

export default RefreshToken;
