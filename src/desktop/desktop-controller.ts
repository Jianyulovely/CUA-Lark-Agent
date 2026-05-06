export interface ScreenshotResult {
  path: string;
  base64: string;
}

export interface DesktopController {
  openApp(appName: string): Promise<void>;
  openGlobalSearch(): Promise<void>;
  openFirstSearchResult(): Promise<void>;
  pasteText(text: string): Promise<void>;
  pressEnter(): Promise<void>;
  wait(ms: number): Promise<void>;
  screenshot(name: string): Promise<ScreenshotResult>;
}
