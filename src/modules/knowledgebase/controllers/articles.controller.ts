// src/modules/knowledgebase/controllers/articles.controller.ts

import { Request, Response } from 'express';
import * as articlesService from '../services/articles.service';
import {
  validateCreateKbArticle,
  validateKbArticleListQuery,
  validateKbArticleStatus,
  validateUpdateKbArticle,
} from '../validators/articles.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

/** The admin list: every matching article, newest first, as a plain array. */
export const getAllKbArticlesController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const filters = validateKbArticleListQuery(req.query as Record<string, unknown>);
  const articles = await articlesService.list(filters);
  return ApiResponse.success(res, articles, 'Knowledgebase articles retrieved successfully');
};

export const getKbArticleByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const article = await articlesService.getById(id);
  return ApiResponse.success(res, article, 'Knowledgebase article retrieved successfully');
};

export const createKbArticleController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateKbArticle(req.body);
  const article = await articlesService.create(dto, buildContext(req));
  return ApiResponse.created(res, article, 'Knowledgebase article created successfully');
};

export const updateKbArticleController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateKbArticle(req.body);
  const article = await articlesService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, article, 'Knowledgebase article updated successfully');
};

export const updateKbArticleStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateKbArticleStatus(req.body);
  const article = await articlesService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    article,
    status === 'ACTIVE' ? 'Knowledgebase article published' : 'Knowledgebase article unpublished',
  );
};

export const deleteKbArticleController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await articlesService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};

// ── public ────────────────────────────────────────────────────────────────

/** One category's page: its header and its articles. 404 unless it is published. */
export const getPublicKbCategoryPageController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const page = await articlesService.getPublishedCategoryPage(String(req.params.slug ?? ''));
  return ApiResponse.success(res, page, 'Knowledgebase category retrieved successfully');
};

/**
 * One article with up to three related guides. 404 unless it and its category
 * are published and the URL names the category it is filed under.
 */
export const getPublicKbArticleController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const article = await articlesService.getPublishedArticle(
    String(req.params.slug ?? ''),
    String(req.params.articleSlug ?? ''),
  );
  return ApiResponse.success(res, article, 'Knowledgebase article retrieved successfully');
};
