export type WaitForTabCompleteDeps = {
  addUpdatedListener: (listener: (tabId: number, info: { status?: string }) => void) => void;
  removeUpdatedListener: (listener: (tabId: number, info: { status?: string }) => void) => void;
  getTab: (tabId: number) => Promise<{ status?: string }>;
  timeoutMs?: number;
};

/**
 * Resolves when the tab reaches status=complete.
 * Always removes the onUpdated listener on success, timeout, or getTab failure.
 */
export function waitForTabComplete(tabId: number, deps: WaitForTabCompleteDeps): Promise<void> {
  const timeoutMs = deps.timeoutMs ?? 30_000;

  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      clearTimeout(timeout);
      deps.removeUpdatedListener(listener);
    };

    const settleReject = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const settleResolve = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    const timeout = setTimeout(() => {
      settleReject(new Error(`Tab ${tabId} load timed out`));
    }, timeoutMs);

    const listener = (updatedTabId: number, info: { status?: string }) => {
      if (updatedTabId !== tabId) return;
      if (info.status === 'complete') {
        settleResolve();
      }
    };

    deps.addUpdatedListener(listener);
    void deps.getTab(tabId).then(
      (tab) => {
        if (tab.status === 'complete') {
          settleResolve();
        }
      },
      (err: unknown) => {
        settleReject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

export function createChromeWaitForTabComplete(): (tabId: number) => Promise<void> {
  return (tabId) =>
    waitForTabComplete(tabId, {
      addUpdatedListener: (listener) => chrome.tabs.onUpdated.addListener(listener),
      removeUpdatedListener: (listener) => chrome.tabs.onUpdated.removeListener(listener),
      getTab: async (id) => {
        const tab = await chrome.tabs.get(id);
        return tab.status !== undefined ? { status: tab.status } : {};
      },
    });
}
