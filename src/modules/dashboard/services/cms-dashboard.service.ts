// src/modules/dashboard/services/cms-dashboard.service.ts

import * as dashboardRepository from '../repositories/dashboard.repository';
import * as cmsRepository from '../repositories/cms-dashboard.repository';
import { CmsDashboard } from '../types/cms-dashboard.types';

/** How many entries each activity list carries. */
const RECENT_ACTIVITY_LIMIT = 8;
const MY_ACTIVITY_LIMIT = 5;

/**
 * Everything the CMS dashboard draws, in one call.
 *
 * Four independent reads, so they go out together - the panel renders them as
 * one screen, and running them in series would make it fill in raggedly for no
 * benefit.
 *
 * The site-wide activity list comes from the existing dashboard repository:
 * "the last few things that happened" is the same question whichever dashboard
 * asks it, so there is one query for it rather than two that could drift.
 */
export const getCmsDashboard = async (adminId: string): Promise<CmsDashboard> => {
  const [inboxes, content, recentActivity, myRecentActivity] = await Promise.all([
    cmsRepository.getInboxes(),
    cmsRepository.getContent(),
    dashboardRepository.getRecentActivity(RECENT_ACTIVITY_LIMIT),
    cmsRepository.getMyRecentActivity(adminId, MY_ACTIVITY_LIMIT),
  ]);

  return {
    inboxes,
    content,
    recentActivity,
    myRecentActivity,
    generatedAt: new Date().toISOString(),
  };
};
