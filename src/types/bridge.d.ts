import type { ProtocolWithReturn } from "webext-bridge";
import type {
  RecordingOptions,
  RecordingState,
  SelectionArea,
} from "./screenshot";

declare module "webext-bridge" {
  export interface ProtocolMap {
    // 截图相关
    "capture:viewport": ProtocolWithReturn<
      { format: string; quality?: number },
      {
        success: boolean;
        fileName: string;
        width: number;
        height: number;
        error?: string;
      }
    >;
    "capture:fullPage": ProtocolWithReturn<
      { format: string; quality?: number },
      {
        success: boolean;
        fileName: string;
        width: number;
        height: number;
        error?: string;
      }
    >;
    "capture:selection": ProtocolWithReturn<
      { format: string; quality?: number },
      {
        success: boolean;
        fileName: string;
        width: number;
        height: number;
        error?: string;
        cancelled?: boolean;
      }
    >;

    // 录制相关 - Popup to Background
    "recording:start-request": ProtocolWithReturn<
      RecordingOptions,
      { success: boolean; tabId?: number; error?: string }
    >;
    "recording:stop-request": ProtocolWithReturn<
      Record<string, never>,
      { success: boolean; fileName?: string; size?: number; error?: string }
    >;
    "recording:get-status": ProtocolWithReturn<
      Record<string, never>,
      { state: RecordingState; tabId: number | null }
    >;

    // 选区截图相关
    "selection:start": ProtocolWithReturn<
      Record<string, never>,
      { area?: SelectionArea; cancelled?: boolean }
    >;
  }
}
