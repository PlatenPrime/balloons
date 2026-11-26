import { readSession } from '../shared/storage.js';
import './popup.css';

function setText(id: string, value: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

async function render(): Promise<void> {
  const session = await readSession(chrome.storage.session);
  setText('apiBaseUrl', session.apiBaseUrl);
  setText('tokenState', session.token ? 'present' : 'missing — log in on web-slices');
  setText('lastError', session.lastError ?? 'none');
  setText('status', 'Ready');
}

void render();
