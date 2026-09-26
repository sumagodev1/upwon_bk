// src/modules/careers/types/applications.types.ts

import { ApplicationStatus } from '../../../config/constants';

/**
 * The applications the Careers page's Apply Now form produces.
 *
 * Vacancies are content: an admin writes them and the website reads them. This
 * runs the other way - the website writes it and only the admin panel reads it
 * - so there is no "public" shape in this file at all. Nothing here is ever
 * served to an anonymous caller, and the resume least of all.
 */

/** What the inbox needs to offer a download, not the file itself. */
export interface CareerApplicationResume {
  fileId: string;
  /** The applicant's own filename, sanitised at upload. */
  fileName: string;
}

/** One row of the Vacancy Applications table. */
export interface CareerApplicationSummary {
  id: string;
  /**
   * Null once the vacancy has been deleted. The admin renders the title either
   * way and marks a null one as a role that no longer exists, so nobody hunts
   * the Vacancy Management tab for it.
   */
  vacancyId: string | null;
  /**
   * The title as it was ADVERTISED, copied in at submission time - not the
   * vacancy's current title. "Applied for X" has to mean the X this person
   * read, whatever it has since been renamed to, and it is all that survives
   * the vacancy being deleted.
   */
  vacancyTitle: string;
  fullName: string;
  email: string;
  phone: string;
  experience: string;
  /** Null when the stored file has since been purged through the files module. */
  resume: CareerApplicationResume | null;
  status: ApplicationStatus;
  createdAt: Date;
}

/**
 * One application in full.
 *
 * Location and the covering message are here rather than on the summary
 * because they are read one candidate at a time, not scanned down a column.
 * The IP and user agent are here for the reason the enquiry inbox gives: they
 * are not part of what the candidate told us, and a list endpoint handing them
 * back by the pageful is a worse leak for no gain.
 */
export interface CareerApplication extends CareerApplicationSummary {
  location: string;
  message: string | null;
  statusUpdatedAt: Date | null;
  /** The administrator's display name, or null while the status is untouched. */
  statusUpdatedBy: string | null;
  submittedIp: string | null;
  submittedUserAgent: string | null;
}

/**
 * The validated submission, minus the file.
 *
 * The triage columns are deliberately absent: they come from the request,
 * never from the body, or a submitter could choose the IP their application is
 * filed under. vacancyTitleSnapshot is absent for the same reason - the
 * service reads it from the vacancy it just verified, so nobody can apply to
 * one role under another's name.
 */
export interface CreateCareerApplicationInput {
  vacancyId: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  experience: string;
  message: string | null;
}

/** A resume that has passed every check and is ready to store. */
export interface ResumeUpload {
  buffer: Buffer;
  /** Already sanitised - see utils/resume-asset.ts. */
  fileName: string;
  mimeType: string;
}

/** The inbox's filters. Search and paging come from parsePagination. */
export interface CareerApplicationFilters {
  vacancyId?: string;
  status?: ApplicationStatus;
  dateFrom?: Date;
  dateTo?: Date;
}
