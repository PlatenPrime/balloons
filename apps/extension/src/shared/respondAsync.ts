/**
 * Ensures chrome.runtime.onMessage always calls sendResponse, even on rejection.
 */
export function respondAsync(
  sendResponse: (response: unknown) => void,
  work: Promise<unknown>,
  onReject: (err: unknown) => unknown,
): void {
  void work.then(sendResponse).catch((err: unknown) => {
    sendResponse(onReject(err));
  });
}
