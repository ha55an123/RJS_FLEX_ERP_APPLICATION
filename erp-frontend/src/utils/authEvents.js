let onSessionInvalid = null;

export function registerSessionInvalidHandler(handler) {
  onSessionInvalid = handler;
}

export function notifySessionInvalid() {
  onSessionInvalid?.();
}
