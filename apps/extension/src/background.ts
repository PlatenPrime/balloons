import { dispatchSwMessage, type BackgroundHandlerDeps } from './backgroundHandlers.js';

const deps: BackgroundHandlerDeps = {
  storage: chrome.storage.session,
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  return dispatchSwMessage(deps, message, sendResponse);
});
