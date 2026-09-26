// src/database/seeds/careers.data.ts

import { WorkMode } from '../../config/constants';

/**
 * The six roles the website's Careers page previously held as a hardcoded
 * array, so /careers renders the same list the moment it starts reading from
 * the API. Source, on the website:
 *
 *   src/pages/Careers/CareersPage.jsx - the ROLES array
 *
 * Titles and departments are verbatim, em dashes included: a seed that
 * "tidied" the copy would show up as a diff on a live page the first time it
 * is run. The location strings are the one thing that changes shape, because
 * the page wrote the place and the arrangement as one field:
 *
 *   'Nashik · On-site'        -> location 'Nashik',        workMode 'On-site'
 *   'Pan-India · Field'       -> location 'Pan-India',     workMode 'Field'
 *   'Mumbai / Pune · On-site' -> location 'Mumbai / Pune', workMode 'On-site'
 *
 * The description, requirements, skills and experience are NEW. The hardcoded
 * list had none - every row was a mailto: link, so there was nothing to open -
 * and the details popup that replaces the link has to have something to show.
 * They are written to be true of the role and plainly editable: a recruiter
 * opening the Vacancy Management tab should find a usable draft, not a
 * placeholder, and not a fiction about salary or headcount that nobody here
 * can vouch for.
 *
 * Every role is seeded ACTIVE and in the order it appears on the page today,
 * so display_order is the array index.
 */

export interface SeedCareerVacancy {
  title: string;
  department: string;
  location: string;
  workMode: WorkMode;
  description: string;
  requirements: string[];
  skills: string[];
  experience: string;
}

export const CAREER_VACANCIES: SeedCareerVacancy[] = [
  {
    title: 'Senior Full-Stack Engineer (Node + React)',
    department: 'Engineering',
    location: 'Nashik',
    workMode: 'On-site',
    description:
      'Build and own end-to-end features across the UpWon suite - the APIs that move production, distribution and finance data, and the React interfaces the people running those operations use all day. You will work close to real food businesses, not to a backlog written in a conference room, and you will see what you ship land on a shop floor.',
    requirements: [
      'Shipped and maintained production software on Node.js and React, end to end',
      'Comfortable designing relational schemas and writing the SQL that reads them',
      'Able to take a vague operational problem and return a working, tested feature',
      'Happy reviewing code closely, and having your own reviewed the same way',
    ],
    skills: ['Node.js', 'TypeScript', 'React', 'PostgreSQL', 'REST APIs', 'Git'],
    experience: '4-8 years',
  },
  {
    title: 'Mobile Lead (React Native)',
    department: 'Engineering',
    location: 'Nashik',
    workMode: 'Hybrid',
    description:
      'Own the UpWon mobile apps that salespeople, delivery staff and outlet managers use in the field - often on mid-range Android phones, often with no signal. You will set the architecture, the release process and the quality bar, and you will be the person who decides what "works offline" actually means here.',
    requirements: [
      'Led a React Native app from architecture through to the store, more than once',
      'Practical experience of offline-first sync and conflict resolution',
      'Fluent in native build tooling on both platforms when the bridge is not enough',
      'Able to mentor two or three engineers without becoming a bottleneck',
    ],
    skills: [
      'React Native',
      'TypeScript',
      'Offline sync',
      'Android',
      'iOS',
      'Performance profiling',
    ],
    experience: '5-9 years',
  },
  {
    title: 'Product Manager — Manufacturing',
    department: 'Product',
    location: 'Nashik',
    workMode: 'Hybrid',
    description:
      'Own the manufacturing side of the UpWon suite: production planning, batch traceability, quality checks and the shop-floor reporting that ties them together. You will spend real days inside food factories, work out what the people there actually do, and turn that into a roadmap the engineering team can build against.',
    requirements: [
      'Owned a B2B or enterprise product area through discovery, delivery and adoption',
      'Willing to spend days on a factory floor rather than in a workshop about one',
      'Can write a specification an engineer can build from without a meeting',
      'Comfortable saying no to a customer request, and explaining why',
    ],
    skills: [
      'Product discovery',
      'ERP / manufacturing workflows',
      'Roadmapping',
      'Stakeholder interviews',
      'Analytics',
    ],
    experience: '4-8 years',
  },
  {
    title: 'Implementation Consultant — Bakery & QSR',
    department: 'Delivery',
    location: 'Pan-India',
    workMode: 'Field',
    description:
      'Take UpWon live inside bakery chains and QSR brands: map how the business runs today, configure the platform around it, migrate the data, train the staff and stay until the first month closes cleanly. This is the role that decides whether a customer succeeds, and most of it happens on site.',
    requirements: [
      'Implemented ERP, POS or similar operational software at customer sites',
      'Willing to travel across India for most of a typical month',
      'Can train a shift manager and a finance head on the same day, in their language',
      'Patient with messy legacy data, and methodical about migrating it',
    ],
    skills: [
      'ERP implementation',
      'POS configuration',
      'Data migration',
      'End-user training',
      'Bakery / QSR operations',
    ],
    experience: '3-6 years',
  },
  {
    title: 'Enterprise Account Executive',
    department: 'Sales',
    location: 'Mumbai / Pune',
    workMode: 'On-site',
    description:
      'Own enterprise deals with food manufacturers, FMCG distributors and franchise brands from first conversation to signature. Long cycles, several stakeholders, and a product that has to be understood rather than pitched - you will be expected to know the operations you are selling into.',
    requirements: [
      'Closed enterprise B2B software deals with multiple stakeholders and a long cycle',
      'Sold into manufacturing, FMCG, retail or food service',
      'Runs a disciplined pipeline and forecasts it honestly',
      'Comfortable in a factory and in a boardroom on the same day',
    ],
    skills: [
      'Enterprise sales',
      'Solution selling',
      'Pipeline management',
      'Negotiation',
      'CRM discipline',
    ],
    experience: '5-10 years',
  },
  {
    title: 'Customer Success Manager',
    department: 'Customer Success',
    location: 'Nashik',
    workMode: 'On-site',
    description:
      'Own a portfolio of live UpWon customers after go-live: watch how they actually use the platform, fix what is not working, bring the product team the problems worth solving, and make renewal the obvious decision rather than a conversation.',
    requirements: [
      'Managed a book of B2B SaaS accounts through renewal, not just onboarding',
      'Can read product usage data and act on what it says',
      'Calm and specific when an operational problem has made a customer angry',
      'Writes clearly - most of this job is written follow-up that actually happens',
    ],
    skills: [
      'Customer success',
      'Account management',
      'Onboarding',
      'Usage analytics',
      'Escalation handling',
    ],
    experience: '3-6 years',
  },
];
