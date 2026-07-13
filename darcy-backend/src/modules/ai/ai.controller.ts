import { Request, Response, NextFunction } from 'express';
import { literal } from 'sequelize';
import { Applicant } from '../applicant/applicant.model';
import { Client } from '../client/client.model';
import { AppError } from '../../middleware/errorHandler';
import { askPipelineAssistant, screenCv } from './ai.service';

export class AiController {
  screenApplicantCv = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError('Attach a CV file in the cv field.', 400);

      const applicant = await Applicant.findByPk(req.params.id, {
        include: [{ model: Client, attributes: ['id', 'businessName', 'contractorType'] }],
      });
      if (!applicant) throw new AppError('Applicant not found', 404);

      const result = await screenCv({
        file: req.file,
        contractorType: applicant.client?.contractorType || 'P&D',
        customCriteria: req.body.criteria,
      });

      await applicant.update({
        aiScore: result.score,
        aiRecommendation: result.recommendation,
        aiAssessment: {
          scoreBreakdown: result.scoreBreakdown,
          summary: result.summary,
          strengths: result.strengths,
          concerns: result.concerns,
          matchedSkills: result.matchedSkills,
          missingRequirements: result.missingRequirements,
          suggestedInterviewQuestions: result.suggestedInterviewQuestions,
          experienceYears: result.experienceYears,
          criteria: result.criteria,
          disclaimer: result.disclaimer,
        },
        aiAnalyzedAt: new Date(),
        aiModel: result.model,
        resumeFileName: req.file.originalname,
      });

      res.json({ success: true, data: applicant });
    } catch (error) {
      next(error);
    }
  };

  assistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const where: Record<string, unknown> = {};
      if (req.body.clientId) where.clientId = req.body.clientId;

      const applicants = await Applicant.findAll({
        where,
        include: [{ model: Client, attributes: ['id', 'businessName', 'contractorType'] }],
        attributes: [
          'id', 'firstName', 'lastName', 'pipelineStatus', 'hireStatus',
          'avpStatus', 'backgroundStatus', 'drugScreenStatus', 'medCardStatus',
          'aiScore', 'aiRecommendation', 'aiAssessment', 'aiAnalyzedAt', 'createdAt',
        ],
        order: [literal('"ai_score" DESC NULLS LAST'), ['createdAt', 'DESC']],
        limit: 100,
      });

      const rows = applicants.map((applicant) => ({
        id: applicant.id,
        name: `${applicant.firstName} ${applicant.lastName}`,
        client: applicant.client?.businessName,
        contractorType: applicant.client?.contractorType,
        pipelineStatus: applicant.pipelineStatus,
        hireStatus: applicant.hireStatus,
        vetting: {
          avp: applicant.avpStatus,
          background: applicant.backgroundStatus,
          drugScreen: applicant.drugScreenStatus,
          medCard: applicant.medCardStatus,
        },
        aiScore: applicant.aiScore,
        aiRecommendation: applicant.aiRecommendation,
        aiSummary: applicant.aiAssessment?.summary,
        strengths: applicant.aiAssessment?.strengths,
        concerns: applicant.aiAssessment?.concerns,
        missingRequirements: applicant.aiAssessment?.missingRequirements,
        aiAnalyzedAt: applicant.aiAnalyzedAt,
      }));

      const answer = await askPipelineAssistant({
        question: req.body.question,
        context: {
          applicantCount: rows.length,
          note: rows.length === 100 ? 'Snapshot capped at 100 applicants.' : undefined,
          applicants: rows,
        },
      });

      res.json({ success: true, data: { answer } });
    } catch (error) {
      next(error);
    }
  };
}
