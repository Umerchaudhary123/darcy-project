import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'pending_onboardings', timestamps: true, underscored: true })
export class PendingOnboarding extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  email!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  businessName!: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  contractorType!: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  contactName!: string;

  @Column({ type: DataType.STRING(20), allowNull: true })
  phone!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  address!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  indeedUsername!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  firstAdvantageUsername!: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  agreementSigned!: boolean;

  @Column({ type: DataType.DATE, allowNull: true })
  agreementSignedAt!: Date;

  @Column({
    type: DataType.ENUM('pending', 'invited', 'payment_pending', 'completed'),
    defaultValue: 'pending',
  })
  status!: 'pending' | 'invited' | 'payment_pending' | 'completed';

  @Column({ type: DataType.STRING(255), allowNull: true })
  stripeSessionId!: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  inviteToken!: string;

  @Column({ type: DataType.DATE, allowNull: true })
  inviteExpiresAt!: Date;

  @Column({ type: DataType.JSONB, allowNull: true })
  formData!: Record<string, unknown>;
}
