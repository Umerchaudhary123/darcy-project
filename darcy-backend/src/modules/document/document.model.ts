import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo,
} from 'sequelize-typescript';
import { Client } from '../client/client.model';
import { User } from '../auth/user.model';

@Table({ tableName: 'documents', timestamps: true, underscored: true })
export class Document extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @ForeignKey(() => Client)
  @Column({ type: DataType.UUID, allowNull: false })
  clientId!: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  uploadedBy!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  fileName!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  originalName!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  mimeType!: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  fileSize!: number;

  @Column({ type: DataType.TEXT, allowNull: false })
  s3Key!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  s3Url!: string;

  @Column({
    type: DataType.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  })
  status!: 'pending' | 'approved' | 'rejected';

  @Column({ type: DataType.STRING(100), allowNull: true })
  documentType!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  adminNotes!: string;

  @Column({ type: DataType.DATE, allowNull: true })
  reviewedAt!: Date;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  reviewedBy!: string;

  @BelongsTo(() => Client)
  client!: Client;
}

export default Document;
