type EventHandler = (...args: any[]) => void;
const listeners: Map<string, EventHandler[]> = new Map();

/**
 * Standalone mock for @create-figma-plugin/utilities `emit`
 */
export function emit(name: string, ...args: any[]): void {
  console.log(`[Harness emit] '${name}':`, ...args);
  window.dispatchEvent(
    new CustomEvent('harness-emit', {
      detail: { name, args, timestamp: new Date() }
    })
  );

  const handlers = listeners.get(name);
  if (handlers) {
    handlers.forEach(fn => fn(...args));
  }
}

export function on(name: string, handler: EventHandler): () => void {
  if (!listeners.has(name)) {
    listeners.set(name, []);
  }
  listeners.get(name)!.push(handler);
  return () => {
    const list = listeners.get(name) || [];
    listeners.set(name, list.filter(fn => fn !== handler));
  };
}

export function once(name: string, handler: EventHandler): () => void {
  const cleanup = on(name, (...args: any[]) => {
    cleanup();
    handler(...args);
  });
  return cleanup;
}
