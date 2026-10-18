export interface SystemEnvironment {
  readonly getReducedMotionPref: () => boolean;
  readonly getLanguages: () => readonly string[];
}
