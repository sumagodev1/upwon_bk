// src/modules/insider-page/controllers/issues.controller.ts

import { Request, Response } from 'express';
import * as issuesService from '../services/issues.service';
import {
  validateCreateInsiderIssue,
  validateInsiderIssueListQuery,
  validateInsiderIssueStatus,
  validateUpdateInsiderIssue,
} from '../validators/issues.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllInsiderIssuesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const filters = validateInsiderIssueListQuery(req.query as Record<string, unknown>);
  const issues = await issuesService.list(filters);
  return ApiResponse.success(res, issues, 'Issues retrieved successfully');
};

export const getInsiderIssueByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const issue = await issuesService.getById(id);
  return ApiResponse.success(res, issue, 'Issue retrieved successfully');
};

export const createInsiderIssueController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateInsiderIssue(req.body);
  const issue = await issuesService.create(dto, buildContext(req));
  return ApiResponse.created(res, issue, 'Issue created successfully');
};

export const updateInsiderIssueController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateInsiderIssue(req.body);
  const issue = await issuesService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, issue, 'Issue updated successfully');
};

export const setCurrentInsiderIssueController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const issue = await issuesService.setCurrent(id, buildContext(req));
  return ApiResponse.success(res, issue, 'Issue is now the current issue');
};

export const updateInsiderIssueStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateInsiderIssueStatus(req.body);
  const issue = await issuesService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    issue,
    status === 'ACTIVE' ? 'Issue published' : 'Issue unpublished',
  );
};

export const deleteInsiderIssueController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await issuesService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};

/**
 * The website-facing reads. Unauthenticated - see the public router in
 * routes/issues.routes.ts.
 */
export const getPublicInsiderIssuesController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const issues = await issuesService.getPublishedIssues();
  return ApiResponse.success(res, issues, 'Issues retrieved successfully');
};

export const getPublicInsiderStoryController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const page = await issuesService.getPublishedStory(req.params.issueSlug, req.params.storySlug);
  return ApiResponse.success(res, page, 'Story retrieved successfully');
};
