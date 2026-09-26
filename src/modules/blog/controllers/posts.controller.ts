// src/modules/blog/controllers/posts.controller.ts

import { Request, Response } from 'express';
import * as postsService from '../services/posts.service';
import {
  validateBlogPostListQuery,
  validateBlogPostStatus,
  validateCreateBlogPost,
  validateUpdateBlogPost,
} from '../validators/posts.validator';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { buildContext } from '../../../core/utils/context';
import { validateUuidParam } from '../../../core/utils/validation';

/** The admin list: every matching post, newest first, as a plain array. */
export const getAllBlogPostsController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const filters = validateBlogPostListQuery(req.query as Record<string, unknown>);
  const posts = await postsService.list(filters);
  return ApiResponse.success(res, posts, 'Blog posts retrieved successfully');
};

export const getBlogPostByIdController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const post = await postsService.getById(id);
  return ApiResponse.success(res, post, 'Blog post retrieved successfully');
};

export const createBlogPostController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const dto = validateCreateBlogPost(req.body);
  const post = await postsService.create(dto, buildContext(req));
  return ApiResponse.created(res, post, 'Blog post created successfully');
};

export const updateBlogPostController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const dto = validateUpdateBlogPost(req.body);
  const post = await postsService.update(id, dto, buildContext(req));
  return ApiResponse.success(res, post, 'Blog post updated successfully');
};

export const updateBlogPostStatusController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  const { status } = validateBlogPostStatus(req.body);
  const post = await postsService.setStatus(id, status, buildContext(req));
  return ApiResponse.success(
    res,
    post,
    status === 'ACTIVE' ? 'Blog post published' : 'Blog post unpublished',
  );
};

export const deleteBlogPostController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const id = validateUuidParam(req.params.id);
  await postsService.remove(id, buildContext(req));
  return ApiResponse.noContent(res);
};

// ── public ────────────────────────────────────────────────────────────────

/**
 * The /blog page's chips and grid in one read. Always a 200 - see
 * postsService.getPublishedIndex for how "nothing authored" is signalled.
 */
export const getPublicBlogIndexController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const index = await postsService.getPublishedIndex();
  return ApiResponse.success(res, index, 'Blog posts retrieved successfully');
};

/** One article with up to three related cards. 404 unless it is published. */
export const getPublicBlogPostController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const post = await postsService.getPublishedPost(String(req.params.slug ?? ''));
  return ApiResponse.success(res, post, 'Blog post retrieved successfully');
};
