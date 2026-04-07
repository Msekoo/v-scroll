import { afterEach, vi } from "vitest";

const RESIZE_OBSERVERS = [],
  MUTATION_OBSERVERS = [],
  CAPTURE_MAP = new WeakMap(),
  createObserver = (store) =>
    class {
      constructor(callback) {
        this.callback = callback;
        this.disconnected = false;
        this.targets = [];
        store.push(this);
      }

      observe(target) {
        this.targets.push(target);
      }

      disconnect() {
        this.disconnected = true;
      }

      trigger(entries = this.targets.map((target) => ({ target }))) {
        this.callback(entries, this);
      }
    };

globalThis.__resize_observers = RESIZE_OBSERVERS;
globalThis.__mutation_observers = MUTATION_OBSERVERS;
globalThis.ResizeObserver = createObserver(RESIZE_OBSERVERS);
globalThis.MutationObserver = createObserver(MUTATION_OBSERVERS);
globalThis.requestAnimationFrame = (callback) => window.setTimeout(() => callback(Date.now()), 0);
globalThis.cancelAnimationFrame = (frame_id) => window.clearTimeout(frame_id);
window.requestAnimationFrame = globalThis.requestAnimationFrame;
window.cancelAnimationFrame = globalThis.cancelAnimationFrame;
window.PointerEvent ||= window.MouseEvent;

if (!window.Element.prototype.setPointerCapture) {
  window.Element.prototype.setPointerCapture = function (pointer_id) {
    const pointer_ids = CAPTURE_MAP.get(this) || new Set();

    pointer_ids.add(pointer_id);
    CAPTURE_MAP.set(this, pointer_ids);
  };
}

if (!window.Element.prototype.releasePointerCapture) {
  window.Element.prototype.releasePointerCapture = function (pointer_id) {
    const pointer_ids = CAPTURE_MAP.get(this);

    pointer_ids?.delete(pointer_id);
  };
}

if (!window.Element.prototype.hasPointerCapture) {
  window.Element.prototype.hasPointerCapture = function (pointer_id) {
    return CAPTURE_MAP.get(this)?.has(pointer_id) || false;
  };
}

const warn = console.warn.bind(console);

vi.spyOn(console, "warn").mockImplementation((...args) => {
  if (args[0] === "[v-scroll] theme css module failed to load") {
    return;
  }

  warn(...args);
});

afterEach(() => {
  document.body.className = "";
  document.body.innerHTML = "";
  document.head.querySelectorAll("[data-v-scroll-theme]").forEach((style_el) => style_el.remove());
  RESIZE_OBSERVERS.length = 0;
  MUTATION_OBSERVERS.length = 0;
  vi.clearAllMocks();
});
