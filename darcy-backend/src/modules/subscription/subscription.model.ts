import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo,
} from 'sequelize-typescript';
import { Client } from '../client/client.model';

@Table({ tableName: 'subscriptions', timestamps: true, underscored: true })
export class Subscription extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @ForeignKey(() => Client)
  @Column({ type: DataType.UUID, allowNull: false, unique: true })
  clientId!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  plan!: 'P&D' | 'Linehaul' | 'Both';

  @Column({
    type: DataType.ENUM('active', 'past_due', 'canceled', 'trialing', 'incomplete'),
    defaultValue: 'incomplete',
  })
  status!: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';

  @Column({ type: DataType.STRING(255), allowNull: true })
  stripeSubscriptionId!: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  stripePriceId!: string;

  @Column({ type: DataType.DATE, allowNull: true })
  currentPeriodStart!: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  currentPeriodEnd!: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  trialEnd!: Date;

  // Add-ons
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  extraIndeedListings!: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  extraTerminals!: number;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  i9Service!: boolean;

  @Column({
  type: DataType.DECIMAL(10, 2),
  allowNull: true,
  get() {
    const value = this.getDataValue('monthlyAmount');
    return value === null ? 0 : Number(value);
  },
})
monthlyAmount!: number;

  @BelongsTo(() => Client)
  client!: Client;
}

export default Subscription;
