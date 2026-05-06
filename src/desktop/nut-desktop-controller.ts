import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  Button,
  clipboard,
  FileType,
  keyboard,
  Key,
  mouse,
  Point,
  screen,
  sleep
} from '@computer-use/nut-js';
import type { DesktopController, ScreenshotResult } from './desktop-controller.js';

export interface NutDesktopControllerOptions {
  screenshotDir: string;
  searchBoxPoint?: {
    x: number;
    y: number;
  };
  firstSearchResultPoint?: {
    x: number;
    y: number;
  };
}

export class NutDesktopController implements DesktopController {
  constructor(private readonly options: NutDesktopControllerOptions) {
    mkdirSync(options.screenshotDir, { recursive: true });
  }

  async openApp(appName: string): Promise<void> {
    await keyboard.pressKey(Key.LeftWin);
    await keyboard.releaseKey(Key.LeftWin);
    await sleep(800);
    await this.pasteText(appName);
    await this.pressEnter();
    await sleep(2500);
  }

  async openGlobalSearch(): Promise<void> {
    const point = this.options.searchBoxPoint ?? { x: 86, y: 74 };
    await mouse.setPosition(new Point(point.x, point.y));
    await mouse.click(Button.LEFT);
    await sleep(800);
    await keyboard.pressKey(Key.LeftControl, Key.A);
    await keyboard.releaseKey(Key.LeftControl, Key.A);
  }

  async openFirstSearchResult(): Promise<void> {
    const point = this.options.firstSearchResultPoint ?? { x: 225, y: 300 };
    await mouse.setPosition(new Point(point.x, point.y));
    await mouse.click(Button.LEFT);
    await sleep(1500);
  }

  async pasteText(text: string): Promise<void> {
    const originalClipboard = await tryGetClipboardContent();
    await clipboard.setContent(text);
    await keyboard.pressKey(Key.LeftControl, Key.V);
    await keyboard.releaseKey(Key.LeftControl, Key.V);
    await sleep(150);
    if (originalClipboard !== undefined) {
      await clipboard.setContent(originalClipboard);
    }
  }

  async pressEnter(): Promise<void> {
    await keyboard.pressKey(Key.Enter);
    await keyboard.releaseKey(Key.Enter);
    await sleep(500);
  }

  async wait(ms: number): Promise<void> {
    await sleep(ms);
  }

  async screenshot(name: string): Promise<ScreenshotResult> {
    const path = await screen.capture(name, FileType.PNG, this.options.screenshotDir);
    const base64 = await imageFileToBase64(path);
    return { path, base64 };
  }
}

async function imageFileToBase64(path: string): Promise<string> {
  const { readFile } = await import('node:fs/promises');
  const buffer = await readFile(path);
  return buffer.toString('base64');
}

async function tryGetClipboardContent(): Promise<string | undefined> {
  try {
    return await clipboard.getContent();
  } catch {
    return undefined;
  }
}
