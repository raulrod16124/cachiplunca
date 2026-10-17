import { UserId } from '../shared/value-objects/user-id';

export type ThemeMode = 'light' | 'dark' | 'system';

export type FontSize = 'sm' | 'base' | 'lg' | 'xl';

export type Locale = 'es' | 'en' | 'system';

export interface UserSettingsProps {
  readonly userId: UserId;
  readonly theme: ThemeMode;
  readonly fontSize: FontSize;
  readonly locale: Locale;
  readonly reducedMotion: boolean;
  readonly version: number;
  readonly updatedAt: Date;
}

const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];
const FONT_SIZES: readonly FontSize[] = ['sm', 'base', 'lg', 'xl'];
const LOCALES: readonly Locale[] = ['es', 'en', 'system'];

export class UserSettings {
  private readonly _userId: UserId;
  private readonly _theme: ThemeMode;
  private readonly _fontSize: FontSize;
  private readonly _locale: Locale;
  private readonly _reducedMotion: boolean;
  private readonly _version: number;
  private readonly _updatedAt: Date;

  private constructor(props: UserSettingsProps) {
    this._userId = props.userId;
    this._theme = props.theme;
    this._fontSize = props.fontSize;
    this._locale = props.locale;
    this._reducedMotion = props.reducedMotion;
    this._version = props.version;
    this._updatedAt = props.updatedAt;
  }

  static create(props: {
    readonly userId: UserId;
    readonly theme?: ThemeMode;
    readonly fontSize?: FontSize;
    readonly locale?: Locale;
    readonly reducedMotion?: boolean;
    readonly version?: number;
    readonly updatedAt?: Date;
  }): UserSettings {
    const userId = props.userId;
    const theme = props.theme ?? 'system';
    const fontSize = props.fontSize ?? 'base';
    const locale = props.locale ?? 'system';
    const reducedMotion = props.reducedMotion ?? false;
    const version = props.version ?? 1;
    const updatedAt = props.updatedAt ?? new Date();

    UserSettings.validateTheme(theme);
    UserSettings.validateFontSize(fontSize);
    UserSettings.validateLocale(locale);
    UserSettings.validateVersion(version);
    UserSettings.validateTimestamp(updatedAt);

    return new UserSettings({
      userId,
      theme,
      fontSize,
      locale,
      reducedMotion,
      version,
      updatedAt,
    });
  }

  update(props: {
    readonly theme?: ThemeMode;
    readonly fontSize?: FontSize;
    readonly locale?: Locale;
    readonly reducedMotion?: boolean;
    readonly updatedAt?: Date;
  }): UserSettings {
    const theme = props.theme ?? this._theme;
    const fontSize = props.fontSize ?? this._fontSize;
    const locale = props.locale ?? this._locale;
    const reducedMotion = props.reducedMotion ?? this._reducedMotion;
    const updatedAt = props.updatedAt ?? new Date();

    UserSettings.validateTheme(theme);
    UserSettings.validateFontSize(fontSize);
    UserSettings.validateLocale(locale);
    UserSettings.validateTimestamp(updatedAt);

    if (
      theme === this._theme &&
      fontSize === this._fontSize &&
      locale === this._locale &&
      reducedMotion === this._reducedMotion
    ) {
      return this;
    }

    return new UserSettings({
      userId: this._userId,
      theme,
      fontSize,
      locale,
      reducedMotion,
      version: this._version + 1,
      updatedAt,
    });
  }

  static fromPersistence(props: UserSettingsProps): UserSettings {
    UserSettings.validateTheme(props.theme);
    UserSettings.validateFontSize(props.fontSize);
    UserSettings.validateLocale(props.locale);
    UserSettings.validateVersion(props.version);
    UserSettings.validateTimestamp(props.updatedAt);
    return new UserSettings(props);
  }

  private static validateTheme(value: ThemeMode): void {
    if (!THEME_MODES.includes(value)) {
      throw new Error('UserSettings theme must be one of: light, dark, system');
    }
  }

  private static validateFontSize(value: FontSize): void {
    if (!FONT_SIZES.includes(value)) {
      throw new Error('UserSettings fontSize must be one of: sm, base, lg, xl');
    }
  }

  private static validateLocale(value: Locale): void {
    if (!LOCALES.includes(value)) {
      throw new Error('UserSettings locale must be one of: es, en, system');
    }
  }

  private static validateVersion(value: number): void {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error('UserSettings version must be a positive integer');
    }
  }

  private static validateTimestamp(value: Date): void {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      throw new Error('UserSettings timestamp must be a valid Date');
    }
  }

  get userId(): UserId {
    return this._userId;
  }

  get theme(): ThemeMode {
    return this._theme;
  }

  get fontSize(): FontSize {
    return this._fontSize;
  }

  get locale(): Locale {
    return this._locale;
  }

  get reducedMotion(): boolean {
    return this._reducedMotion;
  }

  get version(): number {
    return this._version;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  equals(other: UserSettings): boolean {
    return (
      this._userId.equals(other._userId) &&
      this._theme === other._theme &&
      this._fontSize === other._fontSize &&
      this._locale === other._locale &&
      this._reducedMotion === other._reducedMotion &&
      this._version === other._version &&
      this._updatedAt.getTime() === other._updatedAt.getTime()
    );
  }

  toJSON(): {
    userId: string;
    theme: ThemeMode;
    fontSize: FontSize;
    locale: Locale;
    reducedMotion: boolean;
    version: number;
    updatedAt: string;
  } {
    return {
      userId: this._userId.value,
      theme: this._theme,
      fontSize: this._fontSize,
      locale: this._locale,
      reducedMotion: this._reducedMotion,
      version: this._version,
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
