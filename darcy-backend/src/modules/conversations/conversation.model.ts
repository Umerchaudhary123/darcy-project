import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany,
} from 'sequelize-typescript';
import { Client } from '../client/client.model';
import { User } from '../auth/user.model';

@Table({ tableName: 'conversations', timestamps: true, underscored: true })
export class Conversation extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @ForeignKey(() => Client)
  @Column({ type: DataType.UUID, allowNull: false })
  clientId!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  subject!: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  isActive!: boolean;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  unreadByClient!: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  unreadByAdmin!: number;

  @Column({ type: DataType.DATE, allowNull: true })
  lastMessageAt!: Date;

  @BelongsTo(() => Client)
  client!: Client;

  @HasMany(() => Message)
  messages!: Message[];
}

@Table({ tableName: 'messages', timestamps: true, underscored: true })
export class Message extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @ForeignKey(() => Conversation)
  @Column({ type: DataType.UUID, allowNull: false })
  conversationId!: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  senderId!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  content!: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  isRead!: boolean;

  @Column({
    type: DataType.ENUM('client', 'admin'),
    allowNull: false,
  })
  senderRole!: 'client' | 'admin';

  @BelongsTo(() => Conversation)
  conversation!: Conversation;

  @BelongsTo(() => User)
  sender!: User;
}

export default Conversation;
