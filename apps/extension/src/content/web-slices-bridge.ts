import {
  handlePageMessageEvent,
  syncTokenFromPageStorage,
  WEB_SLICES_TOKEN_KEY,
  type BridgeRuntime,
} from './webSlicesBridgeLogic.js';
import type { CaptureResultMessage } from '../shared/protocol.js';

const runtime: BridgeRuntime = {
  postToPage: (message: CaptureResultMessage) => {
    window.postMessage(message, window.location.origin);
  },
  sendToBackground: (message, callback) => {
    void chrome.runtime.sendMessage(message, callback);
  },
  getLastError: () => chrome.runtime.lastError,
  getLocalToken: () => window.localStorage.getItem(WEB_SLICES_TOKEN_KEY),
};

window.addEventListener('message', (event: MessageEvent) => {
  handlePageMessageEvent(runtime, event, {
    self: window,
    origin: window.location.origin,
  });
});

syncTokenFromPageStorage(runtime);
