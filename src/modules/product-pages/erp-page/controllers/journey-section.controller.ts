// src/modules/product-pages/erp-page/controllers/journey-section.controller.ts

import { Request, Response } from 'express';
import { ApiResponse } from '../../../../core/utils/ApiResponse';
import { buildContext } from '../../../../core/utils/context';
import { validateUuidParam } from '../../../../core/utils/validation';
import * as service from '../services/journey-section.service';
import { validateErpStatusBody } from '../validators/recognition-section.validator';
import {
  validateCreateErpJourneyOutcome,
  validateCreateErpJourneyPersona,
  validateCreateErpJourneyPoint,
  validateCreateErpJourneyStat,
  validateErpJourneyPersonaListQuery,
  validateErpJourneyReorder,
  validateUpdateErpJourneyOutcome,
  validateUpdateErpJourneyPersona,
  validateUpdateErpJourneyPoint,
  validateUpdateErpJourneyStat,
} from '../validators/journey-section.validator';

// ── personas ──────────────────────────────────────────────────────────────

export const getAllErpJourneyPersonasController = async (req: Request, res: Response) => {
  const { filters, pagination } = validateErpJourneyPersonaListQuery(
    req.query as Record<string, unknown>,
  );
  const { rows, meta } = await service.listPersonas(filters, pagination);
  return ApiResponse.paginated(res, rows, meta, 'Audiences retrieved successfully');
};

export const getErpJourneyPersonaByIdController = async (req: Request, res: Response) => {
  const persona = await service.getPersonaById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, persona, 'Audience retrieved successfully');
};

export const createErpJourneyPersonaController = async (req: Request, res: Response) => {
  const dto = validateCreateErpJourneyPersona(req.body);
  const persona = await service.createPersona(dto, buildContext(req));
  return ApiResponse.created(res, persona, 'Audience created successfully');
};

export const updateErpJourneyPersonaController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateErpJourneyPersona(req.body);
  const persona = await service.updatePersona(id, dto, buildContext(req));
  return ApiResponse.success(res, persona, 'Audience updated successfully');
};

export const updateErpJourneyPersonaStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateErpStatusBody(req.body);
  const persona = await service.setPersonaStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    persona,
    status === 'ACTIVE' ? 'Audience activated' : 'Audience deactivated',
  );
};

export const reorderErpJourneyPersonasController = async (req: Request, res: Response) => {
  const { ids } = validateErpJourneyReorder(req.body);
  const rows = await service.reorderPersonas(ids, buildContext(req));
  return ApiResponse.success(res, rows, 'Audiences reordered successfully');
};

export const deleteErpJourneyPersonaController = async (req: Request, res: Response) => {
  await service.removePersona(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

// ── measurable outcomes, nested under their persona ────────────────────────

export const getErpJourneyOutcomesController = async (req: Request, res: Response) => {
  const outcomes = await service.listOutcomes(validateUuidParam(req.params.id));
  return ApiResponse.success(res, outcomes, 'Outcomes retrieved successfully');
};

export const getErpJourneyOutcomeByIdController = async (req: Request, res: Response) => {
  const outcome = await service.getOutcomeById(
    validateUuidParam(req.params.id),
    validateUuidParam(req.params.outcomeId),
  );
  return ApiResponse.success(res, outcome, 'Outcome retrieved successfully');
};

export const createErpJourneyOutcomeController = async (req: Request, res: Response) => {
  const personaId = validateUuidParam(req.params.id);
  const dto = validateCreateErpJourneyOutcome(req.body);
  const outcome = await service.createOutcome(personaId, dto, buildContext(req));
  return ApiResponse.created(res, outcome, 'Outcome created successfully');
};

export const updateErpJourneyOutcomeController = async (req: Request, res: Response) => {
  const personaId = validateUuidParam(req.params.id);
  const outcomeId = validateUuidParam(req.params.outcomeId);
  const dto = validateUpdateErpJourneyOutcome(req.body);
  const outcome = await service.updateOutcome(personaId, outcomeId, dto, buildContext(req));
  return ApiResponse.success(res, outcome, 'Outcome updated successfully');
};

export const updateErpJourneyOutcomeStatusController = async (req: Request, res: Response) => {
  const personaId = validateUuidParam(req.params.id);
  const outcomeId = validateUuidParam(req.params.outcomeId);
  const { status } = validateErpStatusBody(req.body);
  const outcome = await service.setOutcomeStatus(
    personaId,
    outcomeId,
    status,
    buildContext(req),
  );
  return ApiResponse.success(
    res,
    outcome,
    status === 'ACTIVE' ? 'Outcome activated' : 'Outcome deactivated',
  );
};

export const reorderErpJourneyOutcomesController = async (req: Request, res: Response) => {
  const personaId = validateUuidParam(req.params.id);
  const { ids } = validateErpJourneyReorder(req.body);
  const outcomes = await service.reorderOutcomes(personaId, ids, buildContext(req));
  return ApiResponse.success(res, outcomes, 'Outcomes reordered successfully');
};

export const deleteErpJourneyOutcomeController = async (req: Request, res: Response) => {
  await service.removeOutcome(
    validateUuidParam(req.params.id),
    validateUuidParam(req.params.outcomeId),
    buildContext(req),
  );
  return ApiResponse.noContent(res);
};

// ── beyond the numbers, nested under their persona ────────────────────────

export const getErpJourneyPointsController = async (req: Request, res: Response) => {
  const points = await service.listPoints(validateUuidParam(req.params.id));
  return ApiResponse.success(res, points, 'Points retrieved successfully');
};

export const getErpJourneyPointByIdController = async (req: Request, res: Response) => {
  const point = await service.getPointById(
    validateUuidParam(req.params.id),
    validateUuidParam(req.params.pointId),
  );
  return ApiResponse.success(res, point, 'Point retrieved successfully');
};

export const createErpJourneyPointController = async (req: Request, res: Response) => {
  const personaId = validateUuidParam(req.params.id);
  const dto = validateCreateErpJourneyPoint(req.body);
  const point = await service.createPoint(personaId, dto, buildContext(req));
  return ApiResponse.created(res, point, 'Point created successfully');
};

export const updateErpJourneyPointController = async (req: Request, res: Response) => {
  const personaId = validateUuidParam(req.params.id);
  const pointId = validateUuidParam(req.params.pointId);
  const dto = validateUpdateErpJourneyPoint(req.body);
  const point = await service.updatePoint(personaId, pointId, dto, buildContext(req));
  return ApiResponse.success(res, point, 'Point updated successfully');
};

export const updateErpJourneyPointStatusController = async (req: Request, res: Response) => {
  const personaId = validateUuidParam(req.params.id);
  const pointId = validateUuidParam(req.params.pointId);
  const { status } = validateErpStatusBody(req.body);
  const point = await service.setPointStatus(personaId, pointId, status, buildContext(req));
  return ApiResponse.success(
    res,
    point,
    status === 'ACTIVE' ? 'Point activated' : 'Point deactivated',
  );
};

export const reorderErpJourneyPointsController = async (req: Request, res: Response) => {
  const personaId = validateUuidParam(req.params.id);
  const { ids } = validateErpJourneyReorder(req.body);
  const points = await service.reorderPoints(personaId, ids, buildContext(req));
  return ApiResponse.success(res, points, 'Points reordered successfully');
};

export const deleteErpJourneyPointController = async (req: Request, res: Response) => {
  await service.removePoint(
    validateUuidParam(req.params.id),
    validateUuidParam(req.params.pointId),
    buildContext(req),
  );
  return ApiResponse.noContent(res);
};

// ── company-wide statistics ───────────────────────────────────────────────

export const getAllErpJourneyStatsController = async (_req: Request, res: Response) => {
  const stats = await service.listStats();
  return ApiResponse.success(res, stats, 'Statistics retrieved successfully');
};

export const getErpJourneyStatByIdController = async (req: Request, res: Response) => {
  const stat = await service.getStatById(validateUuidParam(req.params.id));
  return ApiResponse.success(res, stat, 'Statistic retrieved successfully');
};

export const createErpJourneyStatController = async (req: Request, res: Response) => {
  const dto = validateCreateErpJourneyStat(req.body);
  const stat = await service.createStat(dto, buildContext(req));
  return ApiResponse.created(res, stat, 'Statistic created successfully');
};

export const updateErpJourneyStatController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateErpJourneyStat(req.body);
  const stat = await service.updateStat(id, dto, buildContext(req));
  return ApiResponse.success(res, stat, 'Statistic updated successfully');
};

export const updateErpJourneyStatStatusController = async (req: Request, res: Response) => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateErpStatusBody(req.body);
  const stat = await service.setStatStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    stat,
    status === 'ACTIVE' ? 'Statistic activated' : 'Statistic deactivated',
  );
};

export const reorderErpJourneyStatsController = async (req: Request, res: Response) => {
  const { ids } = validateErpJourneyReorder(req.body);
  const stats = await service.reorderStats(ids, buildContext(req));
  return ApiResponse.success(res, stats, 'Statistics reordered successfully');
};

export const deleteErpJourneyStatController = async (req: Request, res: Response) => {
  await service.removeStat(validateUuidParam(req.params.id), buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * The website-facing read: the whole section in one response.
 *
 * Returns 200 with a null body when nothing is published, rather than a 404 -
 * that is a normal answer here, and the site treats it the way it treats an
 * unreachable API, by keeping its own copy.
 */
export const getPublicErpJourneySectionController = async (_req: Request, res: Response) => {
  const section = await service.getPublished();
  return ApiResponse.success(res, section, 'Benefits journey retrieved successfully');
};
