import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo,
} from 'sequelize-typescript';
import { Client } from '../client/client.model';
import { User } from '../auth/user.model';

@Table({ tableName: 'time_trackings', timestamps: true, underscored: true })
export class TimeTracking extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @ForeignKey(() => Client)
  @Column({ type: DataType.UUID, allowNull: false })
  clientId!: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  adminId!: string;

  @Column({ type: DataType.DATE, allowNull: false })
  startTime!: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  endTime!: Date;

  @Column({ type: DataType.INTEGER, allowNull: true })
  durationMinutes!: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string;

  @BelongsTo(() => Client)
  client!: Client;

  @BelongsTo(() => User)
  admin!: User;
}

export default TimeTracking;
