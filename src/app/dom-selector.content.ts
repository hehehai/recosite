import { browser } from "wxt/browser";
import { MessageType } from "@/types/screenshot";
import { domToImage, domToSvg } from "snapdom";

let isSelecting = false;
let selectedElement: HTMLElement | null = null;
let overlayElement: HTMLDivElement | null = null;
let confirmDialogElement: HTMLDivElement | null = null;
let highlightElement: HTMLDivElement | null = null;

/**
 * 创建高亮遮罩
 */
function createHighlightOverlay(): HTMLDivElement {
  const overlay = document.createElement("div");
  overlay.style.position = "absolute";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
  overlay.style.border = "2px solid #3b82f6";
  overlay.style.pointerEvents = "none";
  overlay.style.zIndex = "2147483646";
  overlay.style.transition = "all 0.1s ease";
  return overlay;
}

/**
 * 创建确认对话框
 */
function createConfirmDialog(element: HTMLElement): HTMLDivElement {
  const dialog = document.createElement("div");
  dialog.style.position = "absolute";
  dialog.style.zIndex = "2147483647";
  dialog.style.display = "flex";
  dialog.style.gap = "8px";
  dialog.style.padding = "8px";
  dialog.style.backgroundColor = "white";
  dialog.style.borderRadius = "8px";
  dialog.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";

  const rect = element.getBoundingClientRect();
  dialog.style.left = `${rect.left + rect.width / 2 - 80}px`;
  dialog.style.top = `${rect.top + rect.height / 2 - 20}px`;

  // 取消按钮
  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "取消";
  cancelBtn.style.padding = "8px 16px";
  cancelBtn.style.border = "none";
  cancelBtn.style.borderRadius = "6px";
  cancelBtn.style.backgroundColor = "#e5e7eb";
  cancelBtn.style.color = "#374151";
  cancelBtn.style.cursor = "pointer";
  cancelBtn.style.fontSize = "14px";
  cancelBtn.style.fontWeight = "500";
  cancelBtn.onclick = () => {
    unselectElement();
  };

  // 确认按钮
  const confirmBtn = document.createElement("button");
  confirmBtn.textContent = "确认";
  confirmBtn.style.padding = "8px 16px";
  confirmBtn.style.border = "none";
  confirmBtn.style.borderRadius = "6px";
  confirmBtn.style.backgroundColor = "#3b82f6";
  confirmBtn.style.color = "white";
  confirmBtn.style.cursor = "pointer";
  confirmBtn.style.fontSize = "14px";
  confirmBtn.style.fontWeight = "500";
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
  overlay.style.position = "fixed";
  overlay.style.top = "20px";
  overlay.style.right = "20px";
  overlay.style.zIndex = "2147483647";
  overlay.style.padding = "12px 20px";
  overlay.style.backgroundColor = "white";
  overlay.style.borderRadius = "8px";
  overlay.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.gap = "12px";
  overlay.style.fontSize = "14px";
  overlay.style.color = "#374151";

  const text = document.createElement("div");
  text.textContent = "选择任意DOM后点击确认";
  text.style.fontWeight = "500";

  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "×";
  closeBtn.style.border = "none";
  closeBtn.style.background = "none";
  closeBtn.style.fontSize = "20px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.color = "#9ca3af";
  closeBtn.style.padding = "0";
  closeBtn.style.width = "20px";
  closeBtn.style.height = "20px";
  closeBtn.style.display = "flex";
  closeBtn.style.alignItems = "center";
  closeBtn.style.justifyContent = "center";
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
  if (!highlightElement) return;

  const rect = element.getBoundingClientRect();
  highlightElement.style.left = `${rect.left + window.scrollX}px`;
  highlightElement.style.top = `${rect.top + window.scrollY}px`;
  highlightElement.style.width = `${rect.width}px`;
  highlightElement.style.height = `${rect.height}px`;
}

/**
 * 鼠标移动处理
 */
function handleMouseMove(e: MouseEvent) {
  if (!isSelecting || selectedElement) return;

  const target = e.target as HTMLElement;
  if (
    !target ||
    target === overlayElement ||
    target === highlightElement ||
    target === confirmDialogElement
  ) {
    return;
  }

  if (highlightElement && highlightElement.parentNode) {
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
  if (!isSelecting || selectedElement) return;

  e.preventDefault();
  e.stopPropagation();

  const target = e.target as HTMLElement;
  if (
    !target ||
    target === overlayElement ||
    target === highlightElement ||
    target === confirmDialogElement
  ) {
    return;
  }

  selectElement(target);
}

/**
 * 选择元素
 */
function selectElement(element: HTMLElement) {
  selectedElement = element;

  // 移除悬停高亮
  if (highlightElement && highlightElement.parentNode) {
    highlightElement.parentNode.removeChild(highlightElement);
    highlightElement = null;
  }

  // 创建选中状态的遮罩
  const selectedOverlay = document.createElement("div");
  selectedOverlay.style.position = "absolute";
  selectedOverlay.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
  selectedOverlay.style.border = "2px solid #3b82f6";
  selectedOverlay.style.pointerEvents = "none";
  selectedOverlay.style.zIndex = "2147483646";

  const rect = element.getBoundingClientRect();
  selectedOverlay.style.left = `${rect.left + window.scrollX}px`;
  selectedOverlay.style.top = `${rect.top + window.scrollY}px`;
  selectedOverlay.style.width = `${rect.width}px`;
  selectedOverlay.style.height = `${rect.height}px`;

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

  if (highlightElement && highlightElement.parentNode) {
    highlightElement.parentNode.removeChild(highlightElement);
    highlightElement = null;
  }

  if (confirmDialogElement && confirmDialogElement.parentNode) {
    confirmDialogElement.parentNode.removeChild(confirmDialogElement);
    confirmDialogElement = null;
  }
}

/**
 * 截取选中的元素
 */
async function captureSelectedElement() {
  if (!selectedElement) return;

  try {
    // 临时移除高亮和对话框
    if (highlightElement && highlightElement.parentNode) {
      highlightElement.parentNode.removeChild(highlightElement);
    }
    if (confirmDialogElement && confirmDialogElement.parentNode) {
      confirmDialogElement.parentNode.removeChild(confirmDialogElement);
    }

    // 使用 snapdom 截取 DOM
    const dataUrl = await domToImage(selectedElement, {
      backgroundColor: "#ffffff",
    });

    // 同时生成 SVG 版本供后续导出使用
    const svgDataUrl = await domToSvg(selectedElement, {
      backgroundColor: "#ffffff",
    });

    // 停止选择模式
    stopDomSelection();

    // 发送结果到 background
    await browser.runtime.sendMessage({
      type: MessageType.CAPTURE_DOM,
      data: {
        dataUrl,
        svgDataUrl,
        width: selectedElement.offsetWidth,
        height: selectedElement.offsetHeight,
      },
    });
  } catch (error) {
    console.error("DOM capture failed:", error);
    stopDomSelection();
  }
}

/**
 * 开始 DOM 选择
 */
export function startDomSelection() {
  if (isSelecting) return;

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

  // 更新扩展图标 badge
  browser.runtime.sendMessage({
    type: MessageType.START_DOM_SELECTION,
  });
}

/**
 * 停止 DOM 选择
 */
export function stopDomSelection() {
  if (!isSelecting) return;

  isSelecting = false;
  selectedElement = null;

  // 移除事件监听
  document.removeEventListener("mousemove", handleMouseMove, true);
  document.removeEventListener("click", handleClick, true);

  // 恢复鼠标样式
  document.body.style.cursor = "";

  // 移除所有覆盖层
  if (overlayElement && overlayElement.parentNode) {
    overlayElement.parentNode.removeChild(overlayElement);
    overlayElement = null;
  }

  if (highlightElement && highlightElement.parentNode) {
    highlightElement.parentNode.removeChild(highlightElement);
    highlightElement = null;
  }

  if (confirmDialogElement && confirmDialogElement.parentNode) {
    confirmDialogElement.parentNode.removeChild(confirmDialogElement);
    confirmDialogElement = null;
  }

  // 清除扩展图标 badge
  browser.runtime.sendMessage({
    type: MessageType.CANCEL_DOM_SELECTION,
  });
}

// 监听来自 background 的消息
browser.runtime.onMessage.addListener((message) => {
  if (message.type === MessageType.START_DOM_SELECTION) {
    startDomSelection();
  } else if (message.type === MessageType.CANCEL_DOM_SELECTION) {
    stopDomSelection();
  }
});
