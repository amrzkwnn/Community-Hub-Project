/**
 * Feature Flags Configuration
 * Control feature availability across the application.
 */
export const FEATURES = {
  /**
   * Kiosk Mode: Temporarily disabled for the current development phase.
   * Can be re-enabled here without any database or code restructuring.
   */
  ENABLE_KIOSK_MODE: false,
} as const;
