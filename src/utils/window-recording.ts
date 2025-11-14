import type { RecordingOptions } from "@/types/screenshot";

/**
 * 开始窗口录制
 * 使用 getDisplayMedia API 让用户选择窗口
 */
export async function startWindowRecording(
  options: RecordingOptions
): Promise<{ success: boolean; streamId?: string; error?: string }> {
  try {
    console.log(
      "[WindowRecording] Starting window recording with options:",
      options
    );

    // 在 Chrome 扩展中，我们需要使用 chrome.tabCapture.getMediaStreamId
    // 但是对于窗口捕获，我们需要使用不同的方法

    // 方案：创建一个 offscreen document 来调用 getDisplayMedia
    // 因为 background service worker 不支持 getDisplayMedia

    // 对于窗口录制，我们需要：
    // 1. 用户选择窗口
    // 2. 获取 MediaStream
    // 3. 开始录制

    // Chrome MV3 中，我们可以使用 chrome.tabCapture.getMediaStreamId + desktopCapture

    const streamId = await new Promise<string>((resolve, reject) => {
      // @ts-expect-error Chrome specific API
      chrome.desktopCapture.chooseDesktopMedia(
        ["window", "screen"],
        (selectedStreamId: string) => {
          if (selectedStreamId) {
            resolve(selectedStreamId);
          } else {
            reject(new Error("User cancelled window selection"));
          }
        }
      );
    });

    console.log("[WindowRecording] Got stream ID:", streamId);

    return { success: true, streamId };
  } catch (error) {
    console.error("[WindowRecording] Failed to start window recording:", error);
    return { success: false, error: String(error) };
  }
}
