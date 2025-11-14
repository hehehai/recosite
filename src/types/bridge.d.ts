import type { ProtocolWithReturn } from "webext-bridge";
import type {
  ImageFormat,
  RecordingOptions,
  RecordingState,
  SelectionArea,
} from "./screenshot";

declare module "webext-bridge" {
  export interface ProtocolMap {
    // 截图相关 - Popup/Content to Background
    "capture:viewport": ProtocolWithReturn<
      { format: ImageFormat; quality?: number },
      {
        success: boolean;
        fileName: string;
        width: number;
        height: number;
        error?: string;
      }
    >;
    "capture:fullPage": ProtocolWithReturn<
      { format: ImageFormat; quality?: number },
      {
        success: boolean;
        fileName: string;
        width: number;
        height: number;
        error?: string;
      }
    >;
    "capture:selection": ProtocolWithReturn<
      { format: ImageFormat; quality?: number },
      {
        success: boolean;
        fileName: string;
        width: number;
        height: number;
        error?: string;
        cancelled?: boolean;
      }
    >;

    // DOM 截图相关 - Popup to Content Script
    "dom:start-selection": ProtocolWithReturn<
      Record<string, never>,
      { success: boolean }
    >;
    "dom:cancel-selection": ProtocolWithReturn<
      Record<string, never>,
      { success: boolean }
    >;
    "dom:confirm-selection": ProtocolWithReturn<
      Record<string, never>,
      { success: boolean }
    >;

    // DOM 截图捕获 - Content to Background
    "dom:capture": ProtocolWithReturn<
      {
        dataUrl: string;
        width: number;
        height: number;
        format: ImageFormat;
      },
      {
        success: boolean;
        fileName?: string;
        error?: string;
      }
    >;

    // 录制相关 - Popup to Background
    "recording:start-request": ProtocolWithReturn<
      RecordingOptions,
      {
        success: boolean;
        tabId?: number;
        recordingType?: string;
        error?: string;
      }
    >;
    "recording:stop-request": ProtocolWithReturn<
      Record<string, never>,
      { success: boolean; fileName?: string; size?: number; error?: string }
    >;
    "recording:get-status": ProtocolWithReturn<
      Record<string, never>,
      {
        state: RecordingState;
        recordingType?: RecordingType;
        tabId: number | null;
      }
    >;
    "recording:track-ended": ProtocolWithReturn<
      Record<string, never>,
      { success: boolean; error?: string }
    >;

    // 录制内部通信 - Background to Offscreen
    "recording:start-internal": ProtocolWithReturn<
      { streamId: string; options: RecordingOptions },
      { success: boolean; error?: string }
    >;
    "recording:stop-internal": ProtocolWithReturn<
      Record<string, never>,
      { success: boolean; data?: Uint8Array; error?: string }
    >;
    "recording:status-internal": ProtocolWithReturn<
      Record<string, never>,
      { isRecording: boolean }
    >;

    // 选区截图相关 - Background to Content Script
    "selection:start": ProtocolWithReturn<
      Record<string, never>,
      { area?: SelectionArea; cancelled?: boolean }
    >;
  }
}
