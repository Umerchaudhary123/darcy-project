import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo,
} from 'sequelize-typescript';
import { Client } from '../client/client.model';
import { Applicant } from '../applicant/applicant.model';

@Table({ tableName: 'availability_slots', timestamps: true, underscored: true })
export class AvailabilitySlot extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @ForeignKey(() => Client)
  @Column({ type: DataType.UUID, allowNull: false })
  clientId!: string;

  @Column({ type: DataType.DATE, allowNull: false })
  startTime!: Date;

  @Column({ type: DataType.DATE, allowNull: false })
  endTime!: Date;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  isBooked!: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  isRecurring!: boolean;

  @Column({
    type: DataType.ENUM('none', 'daily', 'weekly'),
    defaultValue: 'none',
  })
  recurringType!: 'none' | 'daily' | 'weekly';

  @ForeignKey(() => Applicant)
  @Column({ type: DataType.UUID, allowNull: true })
  bookedApplicantId!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string;

  @BelongsTo(() => Client)
  client!: Client;

  @BelongsTo(() => Applicant)
  bookedApplicant!: Applicant;
}

export default AvailabilitySlot;
