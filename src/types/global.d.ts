/**
 * Ambient declarations that apply to the whole project.
 *
 * Express request augmentation lives in src/core/types/express.d.ts.
 * This file is reserved for third-party modules that ship no types and for
 * project-wide globals.
 */

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: 'development' | 'test' | 'production';
  }
}

export {};
