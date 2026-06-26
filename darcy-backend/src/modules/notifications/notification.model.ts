import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo,
} from 'sequelize-typescript';
import { User } from '../auth/user.model';
import { Client } from '../client/client.model';

@Table({ tableName: 'notifications', timestamps: true, underscored: true })
export class Notification extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  userId!: string;

  @ForeignKey(() => Client)
  @Column({ type: DataType.UUID, allowNull: true })
  clientId!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  title!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  body!: string;

  @Column({
    type: DataType.ENUM(
      'new_message', 'document_approved', 'document_rejected', 'document_uploaded',
      'applicant_ready', 'interview_scheduled', 'subscription', 'system'
    ),
    allowNull: false,
  })
  type!: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  isRead!: boolean;

  @Column({ type: DataType.TEXT, allowNull: true })
  linkUrl!: string;

  @Column({ type: DataType.JSONB, allowNull: true })
  metadata!: Record<string, unknown>;

  @BelongsTo(() => User)
  user!: User;

  @BelongsTo(() => Client)
  client!: Client;
}

export default Notification;
