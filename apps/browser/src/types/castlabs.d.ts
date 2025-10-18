/**
 * Type definitions for castlabs electron-releases
 * @see https://github.com/castlabs/electron-releases
 */

declare module 'electron' {
  /**
   * Components API for managing Widevine CDM
   * Available in castlabs electron-releases
   */
  export interface Components {
    /**
     * Get the current status of components
     */
    status(): string;

    /**
     * Check if component updates are enabled
     */
    updatesEnabled: boolean;

    /**
     * Wait for all components to be ready
     * @returns Promise that resolves when components are ready
     */
    whenReady(): Promise<any>;
  }

  /**
   * Components instance for Widevine CDM management
   * Available in castlabs electron-releases
   */
  export const components: Components | undefined;
}

// Augment the global Electron namespace
declare global {
  namespace Electron {
    interface App {
      /**
       * Check if EVS (Electron Verification Service) is enabled
       * Available in castlabs electron-releases
       */
      isEVSEnabled?(): boolean;
    }
  }
}
