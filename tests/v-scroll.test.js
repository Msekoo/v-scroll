import { beforeAll, describe, expect, it } from "vitest";

const waitFrame = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  },
  createPointerEvent = (type, { button = 0, client_y = 0, pointer_id = 1 } = {}) => {
    const event = new window.MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      button,
      clientY: client_y
    });

    Object.defineProperty(event, "pointerId", {
      configurable: true,
      value: pointer_id
    });

    return event;
  },
  setScrollMetrics = (scroll_el, { client_height, scroll_height, scroll_top = 0 }) => {
    const metrics = {
      client_height,
      scroll_height,
      scroll_top
    };

    Object.defineProperties(scroll_el, {
      clientHeight: {
        configurable: true,
        get: () => metrics.client_height
      },
      scrollHeight: {
        configurable: true,
        get: () => metrics.scroll_height
      },
      scrollTop: {
        configurable: true,
        get: () => metrics.scroll_top,
        set: (value) => {
          metrics.scroll_top = value;
        }
      }
    });

    return metrics;
  },
  getResizeObserver = (host) =>
    globalThis.__resize_observers.find((observer) => observer.targets.includes(host)),
  syncHost = async (host) => {
    getResizeObserver(host)?.trigger();
    await waitFrame();
  };

beforeAll(async () => {
  await import("../src/v-scroll.js");
});

describe("v-scroll", () => {
  it("registers the custom element and creates the expected shadow structure", async () => {
    const host = document.createElement("v-scroll");

    document.body.append(host);
    await waitFrame();

    expect(customElements.get("v-scroll")).toBeTypeOf("function");
    expect(host.shadowRoot).not.toBeNull();
    expect(host.shadowRoot.querySelector('[part="scroll"]')).not.toBeNull();
    expect(host.shadowRoot.querySelector('[part="display"]')).not.toBeNull();
    expect(host.shadowRoot.querySelector('[part~="track"]')).not.toBeNull();
    expect(host.shadowRoot.querySelector('[part~="bar"]')).not.toBeNull();
  });

  it("shows and hides the custom scrollbar based on overflow and syncs thumb metrics", async () => {
    const host = document.createElement("v-scroll");

    document.body.append(host);

    const scroll_el = host.shadowRoot.querySelector('[part="scroll"]'),
      track_el = host.shadowRoot.querySelector('[part~="track"]'),
      bar_el = host.shadowRoot.querySelector('[part~="bar"]');

    setScrollMetrics(scroll_el, {
      client_height: 100,
      scroll_height: 400,
      scroll_top: 50
    });
    await syncHost(host);

    expect(host.hasAttribute("scrollable")).toBe(true);
    expect(track_el.hidden).toBe(false);
    expect(bar_el.hidden).toBe(false);
    expect(parseFloat(host.style.getPropertyValue("--v-scroll-thumb-size"))).toBeCloseTo(23.5);
    expect(parseFloat(host.style.getPropertyValue("--v-scroll-thumb-offset"))).toBeCloseTo(14.75);

    setScrollMetrics(scroll_el, {
      client_height: 100,
      scroll_height: 100,
      scroll_top: 0
    });
    await syncHost(host);

    expect(host.hasAttribute("scrollable")).toBe(false);
    expect(track_el.hidden).toBe(true);
    expect(bar_el.hidden).toBe(true);
  });

  it("maps pointer drag movement to scrollTop and clears drag state on release", async () => {
    const host = document.createElement("v-scroll");

    document.body.append(host);

    const scroll_el = host.shadowRoot.querySelector('[part="scroll"]'),
      bar_el = host.shadowRoot.querySelector('[part~="bar"]'),
      metrics = setScrollMetrics(scroll_el, {
        client_height: 100,
        scroll_height: 400,
        scroll_top: 0
      });

    await syncHost(host);
    bar_el.dispatchEvent(createPointerEvent("pointerdown", { client_y: 10, pointer_id: 9 }));

    expect(host.hasAttribute("dragging")).toBe(true);
    expect(document.body.classList.contains("drag")).toBe(true);
    expect(bar_el.hasPointerCapture(9)).toBe(true);

    bar_el.dispatchEvent(createPointerEvent("pointermove", { client_y: 40, pointer_id: 9 }));
    await waitFrame();

    expect(metrics.scroll_top).toBeCloseTo(127.659574, 5);

    bar_el.dispatchEvent(createPointerEvent("pointerup", { client_y: 40, pointer_id: 9 }));

    expect(host.hasAttribute("dragging")).toBe(false);
    expect(document.body.classList.contains("drag")).toBe(false);
    expect(bar_el.hasPointerCapture(9)).toBe(false);
  });

  it("disconnects observers and clears body drag state when the element is removed", async () => {
    const host = document.createElement("v-scroll");

    document.body.append(host);

    const scroll_el = host.shadowRoot.querySelector('[part="scroll"]'),
      bar_el = host.shadowRoot.querySelector('[part~="bar"]');

    setScrollMetrics(scroll_el, {
      client_height: 100,
      scroll_height: 400,
      scroll_top: 0
    });
    await syncHost(host);

    const resize_observer = getResizeObserver(host),
      mutation_observer = globalThis.__mutation_observers.at(-1);

    bar_el.dispatchEvent(createPointerEvent("pointerdown", { client_y: 12, pointer_id: 3 }));
    host.remove();

    expect(document.body.classList.contains("drag")).toBe(false);
    expect(host.hasAttribute("dragging")).toBe(false);
    expect(resize_observer.disconnected).toBe(true);
    expect(mutation_observer.disconnected).toBe(true);
  });
});
