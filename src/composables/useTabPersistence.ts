import { onMounted, ref, watch } from "vue";
import { browser } from "wxt/browser";

export type TabType = "screenshot" | "recording";

/**
 * Tab 持久化 Hook
 * 用于在 popup 中保存和恢复上次选择的 tab
 */
export function useTabPersistence(defaultTab: TabType = "screenshot") {
  const activeTab = ref<TabType>(defaultTab);
  const loading = ref(true);

  /**
   * 从 storage 加载上次的 tab 位置
   */
  async function loadLastActiveTab() {
    try {
      const result = await browser.storage.local.get("activeTab");
      if (result.activeTab) {
        activeTab.value = result.activeTab as TabType;
      }
    } catch (err) {
      console.error("Failed to load last active tab:", err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * 保存当前 tab 到 storage
   */
  async function saveActiveTab(tab: TabType) {
    try {
      await browser.storage.local.set({ activeTab: tab });
    } catch (err) {
      console.error("Failed to save active tab:", err);
    }
  }

  // 监听 tab 变化并自动保存
  watch(activeTab, (newTab) => {
    saveActiveTab(newTab);
  });

  // 页面加载时恢复上次的 tab
  onMounted(() => {
    loadLastActiveTab();
  });

  return {
    activeTab,
    loading,
  };
}
