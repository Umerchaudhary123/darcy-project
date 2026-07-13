import {
  Table, Column, Model, DataType, ForeignKey, BelongsTo,
} from 'sequelize-typescript';
import { Client } from '../client/client.model';

export interface AiScoreBreakdown {
  relevantExperience: number;
  licensesAndSkills: number;
  safetyAndCompliance: number;
  workHistory: number;
  resumeQuality: number;
}

export interface AiAssessment {
  scoreBreakdown: AiScoreBreakdown;
  summary: string;
  strengths: string[];
  concerns: string[];
  matchedSkills: string[];
  missingRequirements: string[];
  suggestedInterviewQuestions: string[];
  experienceYears: number | null;
  criteria: string;
  disclaimer: string;
}

@Table({ tableName: 'applicants', timestamps: true, underscored: true })
export class Applicant extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @ForeignKey(() => Client)
  @Column({ type: DataType.UUID, allowNull: false })
  clientId!: string;

  // Personal info
  @Column({ type: DataType.STRING(100), allowNull: false })
  firstName!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  lastName!: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  email!: string;

  @Column({ type: DataType.STRING(20), allowNull: true })
  phone!: string;

  // Vetting statuses
  @Column({
    type: DataType.ENUM('pending', 'passed', 'failed', 'waived'),
    defaultValue: 'pending',
  })
  avpStatus!: 'pending' | 'passed' | 'failed' | 'waived';

  @Column({
    type: DataType.ENUM('pending', 'ordered', 'clear', 'consider', 'failed'),
    defaultValue: 'pending',
  })
  backgroundStatus!: 'pending' | 'ordered' | 'clear' | 'consider' | 'failed';

  @Column({
    type: DataType.ENUM('pending', 'ordered', 'negative', 'positive', 'failed'),
    defaultValue: 'pending',
  })
  drugScreenStatus!: 'pending' | 'ordered' | 'negative' | 'positive' | 'failed';

  @Column({
    type: DataType.ENUM('pending', 'verified', 'expired', 'missing', 'failed'),
    defaultValue: 'pending',
  })
  medCardStatus!: 'pending' | 'verified' | 'expired' | 'missing' | 'failed';

  // Computed pipeline status
  @Column({
    type: DataType.ENUM('in_progress', 'interview_ready', 'disqualified'),
    defaultValue: 'in_progress',
  })
  pipelineStatus!: 'in_progress' | 'interview_ready' | 'disqualified';

  // Interview / hire
  @Column({
    type: DataType.ENUM('in_progress', 'hired', 'rejected'),
    allowNull: true,
  })
  hireStatus!: 'in_progress' | 'hired' | 'rejected';

  @Column({ type: DataType.DATE, allowNull: true })
  interviewDate!: Date;

  @Column({ type: DataType.STRING(255), allowNull: true })
  interviewSlotId!: string;

  // Notes
  @Column({ type: DataType.TEXT, allowNull: true })
  adminNotes!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  clientNotes!: string;

  // Auto-removal tracking
  @Column({ type: DataType.DATE, allowNull: true })
  disqualifiedAt!: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  nonQualifiedAt!: Date;

  // Source
  @Column({ type: DataType.STRING(100), allowNull: true })
  source!: string; // e.g. 'Indeed', 'Referral', 'Direct'

  // AI CV screening. The numeric score is kept separately for fast ranking.
  @Column({ type: DataType.INTEGER, allowNull: true })
  aiScore!: number | null;

  @Column({ type: DataType.STRING(30), allowNull: true })
  aiRecommendation!: 'high_alignment' | 'good_alignment' | 'review' | 'limited_evidence' | null;

  @Column({ type: DataType.JSONB, allowNull: true })
  aiAssessment!: AiAssessment | null;

  @Column({ type: DataType.DATE, allowNull: true })
  aiAnalyzedAt!: Date | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  aiModel!: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  resumeFileName!: string | null;

  @BelongsTo(() => Client)
  client!: Client;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}

export default Applicant;
