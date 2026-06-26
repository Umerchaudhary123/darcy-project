import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany, HasOne,
} from 'sequelize-typescript';
import { User } from '../auth/user.model';
import { Applicant } from '../applicant/applicant.model';
import { Subscription } from '../subscription/subscription.model';
import { Document } from '../document/document.model';
import { Conversation } from '../conversations/conversation.model';
import { Notification } from '../notifications/notification.model';
import { TimeTracking } from '../admin/timeTracking.model';

@Table({ tableName: 'clients', timestamps: true, underscored: true })
export class Client extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  userId!: string;

  // Business info
  @Column({ type: DataType.STRING(255), allowNull: false })
  businessName!: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  contractorType!: 'P&D' | 'Linehaul' | 'Both';

  @Column({ type: DataType.STRING(255), allowNull: true })
  contactName!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  email!: string;

  @Column({ type: DataType.STRING(20), allowNull: true })
  phone!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  address!: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  city!: string;

  @Column({ type: DataType.STRING(50), allowNull: true })
  state!: string;

  @Column({ type: DataType.STRING(10), allowNull: true })
  zip!: string;

  // External credentials (encrypted in production)
  @Column({ type: DataType.TEXT, allowNull: true })
  indeedUsername!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  indeedPassword!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  firstAdvantageUsername!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  firstAdvantagePassword!: string;

  // Service agreement
  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  agreementSigned!: boolean;

  @Column({ type: DataType.DATE, allowNull: true })
  agreementSignedAt!: Date;

  // Status
  @Column({
    type: DataType.ENUM('pending', 'invited', 'active', 'archived', 'suspended'),
    defaultValue: 'pending',
  })
  status!: 'pending' | 'invited' | 'active' | 'archived' | 'suspended';

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  displayOrder!: number;

  // Stripe
  @Column({ type: DataType.STRING(255), allowNull: true })
  stripeCustomerId!: string;

  // Notes (admin only)
  @Column({ type: DataType.TEXT, allowNull: true })
  adminNotes!: string;

  // Invite token
  @Column({ type: DataType.STRING(255), allowNull: true })
  inviteToken!: string;

  @Column({ type: DataType.DATE, allowNull: true })
  inviteExpiresAt!: Date;

  @BelongsTo(() => User)
  user!: User;

  @HasMany(() => Applicant)
  applicants!: Applicant[];

  @HasOne(() => Subscription)
  subscription!: Subscription;

  @HasMany(() => Document)
  documents!: Document[];

  @HasMany(() => Conversation)
  conversations!: Conversation[];

  @HasMany(() => Notification)
  notifications!: Notification[];

  @HasMany(() => TimeTracking)
  timeTrackings!: TimeTracking[];
}

export default Client;
