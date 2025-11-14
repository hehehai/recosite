import { snapdom } from "@zumer/snapdom";
import { ImageFormat } from "@/types/screenshot";

/**
 * 类型安全的样式设置工具函数
 * 批量设置元素的样式属性
 */
function setStyles(
  element: HTMLElement,
  styles: Partial<CSSStyleDeclaration>
): void {
  Object.assign(element.style, styles);
}

let isSelecting = false;
let selectedElement: HTMLElement | null = null;
let overlayElement: HTMLDivElement | null = null;
let confirmDialogElement: HTMLDivElement | null = null;
let highlightElement: HTMLDivElement | null = null;

// 模块级别的 sendMessage 引用
let sendMessageFn: any = null;

export default defineContentScript({
  matches: ["<all_urls>"],

  async main() {
    console.log("[DOM Selector] Content script loaded");

    // 动态导入 webext-bridge 以避免构建时初始化
    const { onMessage, sendMessage: sendMessageBridge } = await import(
      "webext-bridge/content-script"
    );

    // 存储 sendMessage 到模块变量
    sendMessageFn = sendMessageBridge;

    // 使用 webext-bridge 监听消息
    onMessage("dom:start-selection", () => {
      console.log("[DOM Selector] Received dom:start-selection");
      startDomSelection();
      return { success: true };
    });

    onMessage("dom:cancel-selection", () => {
      console.log("[DOM Selector] Received dom:cancel-selection");
      stopDomSelection();
      return { success: true };
    });
  },
});

/**
 * 创建高亮遮罩
 */
function createHighlightOverlay(): HTMLDivElement {
  const overlay = document.createElement("div");
  setStyles(overlay, {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    border: "2px solid #3b82f6",
    pointerEvents: "none",
    zIndex: "2147483646",
    transition: "all 0.1s ease",
  });
  return overlay;
}

/**
 * 创建确认对话框
 */
function createConfirmDialog(element: HTMLElement): HTMLDivElement {
  const dialog = document.createElement("div");
  const rect = element.getBoundingClientRect();

  setStyles(dialog, {
    position: "absolute",
    zIndex: "2147483647",
    display: "flex",
    gap: "8px",
    padding: "8px",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    left: `${rect.left + rect.width / 2 - 120}px`,
    top: `${rect.top + rect.height / 2 - 20}px`,
  });

  // 取消按钮
  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "取消";
  setStyles(cancelBtn, {
    padding: "8px 16px",
    border: "none",
    borderRadius: "6px",
    backgroundColor: "#e5e7eb",
    color: "#374151",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  });
  cancelBtn.onclick = () => {
    unselectElement();
  };

  // 确认按钮
  const confirmBtn = document.createElement("button");
  confirmBtn.textContent = "确认";
  setStyles(confirmBtn, {
    padding: "8px 16px",
    border: "none",
    borderRadius: "6px",
    backgroundColor: "#3b82f6",
    color: "white",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  });
  confirmBtn.onclick = async () => {
    await captureSelectedElement();
  };

  dialog.appendChild(cancelBtn);
  dialog.appendChild(confirmBtn);

  return dialog;
}

/**
 * 创建提示覆盖层
 */
function createInstructionOverlay(): HTMLDivElement {
  const overlay = document.createElement("div");
  setStyles(overlay, {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: "2147483647",
    padding: "12px 20px",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "14px",
    color: "#374151",
  });

  const text = document.createElement("div");
  text.textContent = "选择任意DOM后点击确认";
  setStyles(text, {
    fontWeight: "500",
  });

  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "×";
  setStyles(closeBtn, {
    border: "none",
    background: "none",
    fontSize: "20px",
    cursor: "pointer",
    color: "#9ca3af",
    padding: "0",
    width: "20px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });
  closeBtn.onclick = () => {
    stopDomSelection();
  };

  overlay.appendChild(text);
  overlay.appendChild(closeBtn);

  return overlay;
}

/**
 * 更新高亮位置
 */
function updateHighlight(element: HTMLElement) {
  if (!highlightElement) {
    return;
  }

  const rect = element.getBoundingClientRect();
  highlightElement.style.left = `${rect.left + window.scrollX}px`;
  highlightElement.style.top = `${rect.top + window.scrollY}px`;
  highlightElement.style.width = `${rect.width}px`;
  highlightElement.style.height = `${rect.height}px`;
}

/**
 * 检查元素是否是工具元素或其子元素
 */
function isToolElement(element: HTMLElement): boolean {
  if (
    element === overlayElement ||
    element === highlightElement ||
    element === confirmDialogElement
  ) {
    return true;
  }

  // 检查是否是工具元素的子元素
  if (overlayElement?.contains(element)) {
    return true;
  }
  if (confirmDialogElement?.contains(element)) {
    return true;
  }

  return false;
}

/**
 * 鼠标移动处理
 */
function handleMouseMove(e: MouseEvent) {
  if (!isSelecting || selectedElement) {
    return;
  }

  const target = e.target as HTMLElement;
  if (!target || isToolElement(target)) {
    return;
  }

  if (highlightElement?.parentNode) {
    highlightElement.parentNode.removeChild(highlightElement);
  }

  highlightElement = createHighlightOverlay();
  updateHighlight(target);
  document.body.appendChild(highlightElement);
}

/**
 * 点击处理
 */
function handleClick(e: MouseEvent) {
  if (!isSelecting || selectedElement) {
    return;
  }

  const target = e.target as HTMLElement;
  if (!target || isToolElement(target)) {
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  selectElement(target);
}

/**
 * 选择元素
 */
function selectElement(element: HTMLElement) {
  selectedElement = element;

  // 移除悬停高亮
  if (highlightElement?.parentNode) {
    highlightElement.parentNode.removeChild(highlightElement);
    highlightElement = null;
  }

  // 创建选中状态的遮罩
  const selectedOverlay = document.createElement("div");
  const rect = element.getBoundingClientRect();

  setStyles(selectedOverlay, {
    position: "absolute",
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    border: "2px solid #3b82f6",
    pointerEvents: "none",
    zIndex: "2147483646",
    left: `${rect.left + window.scrollX}px`,
    top: `${rect.top + window.scrollY}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });

  document.body.appendChild(selectedOverlay);
  highlightElement = selectedOverlay;

  // 创建确认对话框
  confirmDialogElement = createConfirmDialog(element);
  document.body.appendChild(confirmDialogElement);
}

/**
 * 取消选择
 */
function unselectElement() {
  selectedElement = null;

  if (highlightElement?.parentNode) {
    highlightElement.parentNode.removeChild(highlightElement);
    highlightElement = null;
  }

  if (confirmDialogElement?.parentNode) {
    confirmDialogElement.parentNode.removeChild(confirmDialogElement);
    confirmDialogElement = null;
  }
}

/**
 * 截取选中的元素
 */
async function captureSelectedElement() {
  if (!selectedElement) {
    return;
  }

  // 保存引用，因为 stopDomSelection 会清空 selectedElement
  const element = selectedElement;

  try {
    // 先立即清理所有 UI 元素和状态（在截图之前）
    stopDomSelection();

    // 等待一帧，确保清理完成
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // 使用 snapdom 生成 PNG
    const pngOptions = {
      backgroundColor: "#ffffff",
      allowTaint: true,
      useCORS: true,
      cache: "disabled" as const,
    };

    const pngImage = await snapdom.toPng(element, pngOptions);
    const dataUrl = pngImage.src;

    // 使用 webext-bridge 发送结果到 background
    if (!sendMessageFn) {
      throw new Error("sendMessage not initialized");
    }
    await sendMessageFn(
      "dom:capture",
      {
        dataUrl,
        width: element.offsetWidth,
        height: element.offsetHeight,
        format: ImageFormat.PNG,
      },
      "background"
    );
  } catch (error) {
    console.error("DOM capture failed:", error);
    // 确保即使出错也清理 UI
    stopDomSelection();

    // 显示错误提示
    const errorMsg = error instanceof Error ? error.message : String(error);
    let userMessage = "DOM 截图失败";

    if (errorMsg.includes("EncodingError") || errorMsg.includes("decode")) {
      userMessage =
        "该元素包含无法处理的图片资源（可能是跨域图片），请尝试选择其父元素或其他元素";
    } else if (errorMsg.includes("tainted") || errorMsg.includes("CORS")) {
      userMessage = "该元素包含跨域资源，无法截图。请尝试选择其他元素";
    }

    // 显示错误提示（3秒后自动消失）
    showErrorNotification(userMessage);
  }
}

/**
 * 显示错误通知
 */
function showErrorNotification(message: string) {
  const notification = document.createElement("div");
  setStyles(notification, {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: "2147483647",
    padding: "12px 24px",
    backgroundColor: "#ef4444",
    color: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    fontSize: "14px",
    fontWeight: "500",
  });
  notification.textContent = message;

  document.body.appendChild(notification);

  // 3秒后自动移除
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

/**
 * 开始 DOM 选择
 */
function startDomSelection() {
  if (isSelecting) {
    return;
  }

  isSelecting = true;
  selectedElement = null;

  // 创建提示覆盖层
  overlayElement = createInstructionOverlay();
  document.body.appendChild(overlayElement);

  // 添加事件监听
  document.addEventListener("mousemove", handleMouseMove, true);
  document.addEventListener("click", handleClick, true);

  // 修改鼠标样式
  document.body.style.cursor = "crosshair";
}

/**
 * 停止 DOM 选择
 */
function stopDomSelection() {
  if (!isSelecting) {
    return;
  }

  isSelecting = false;
  selectedElement = null;

  // 移除事件监听
  document.removeEventListener("mousemove", handleMouseMove, true);
  document.removeEventListener("click", handleClick, true);

  // 恢复鼠标样式
  document.body.style.cursor = "";

  // 移除所有覆盖层
  if (overlayElement?.parentNode) {
    overlayElement.parentNode.removeChild(overlayElement);
    overlayElement = null;
  }

  if (highlightElement?.parentNode) {
    highlightElement.parentNode.removeChild(highlightElement);
    highlightElement = null;
  }

  if (confirmDialogElement?.parentNode) {
    confirmDialogElement.parentNode.removeChild(confirmDialogElement);
    confirmDialogElement = null;
  }
}
