// src/modules/about-page/controllers/team-members.controller.ts

import { Request, Response } from 'express';
import * as teamMembersService from '../services/team-members.service';
import {
  validateAboutTeamMemberListQuery,
  validateAboutTeamMemberStatus,
  validateCreateAboutTeamMember,
  validateReorderAboutTeamMembers,
  validateUpdateAboutTeamMember,
} from '../validators/team-members.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

export const getAllAboutTeamMembersController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const filters = validateAboutTeamMemberListQuery(req.query as Record<string, unknown>);
  const members = await teamMembersService.list(filters);
  return ApiResponse.success(res, members, 'Team members retrieved successfully');
};

export const getAboutTeamMemberByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const member = await teamMembersService.getById(id);
  return ApiResponse.success(res, member, 'Team member retrieved successfully');
};

export const createAboutTeamMemberController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateAboutTeamMember(req.body);
  const member = await teamMembersService.create(dto, buildContext(req));
  return ApiResponse.created(res, member, 'Team member added successfully');
};

export const updateAboutTeamMemberController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateAboutTeamMember(req.body);
  const member = await teamMembersService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, member, 'Team member updated successfully');
};

export const updateAboutTeamMemberStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateAboutTeamMemberStatus(req.body);
  const member = await teamMembersService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    member,
    status === 'ACTIVE' ? 'Team member published' : 'Team member unpublished',
  );
};

export const reorderAboutTeamMembersController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { ids } = validateReorderAboutTeamMembers(req.body);
  const members = await teamMembersService.reorder(ids, buildContext(req));
  return ApiResponse.success(res, members, 'Team members reordered successfully');
};

export const deleteAboutTeamMemberController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await teamMembersService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};
