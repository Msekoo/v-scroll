const TAG = "v-scroll",
  BAR_GAP = 3,
  BAR_MIN = 16,
  ACTIVE_DELAY = 720,
  STYLE_ATTR = "data-v-scroll-theme",
  THEME_IMPORT_PATH = "$/v-scroll.js",
  TRACK_PART = "track",
  BAR_PART = "bar",
  TURNED_PART = "turned",
  DRAG_PART = "drag",
  BODY_DRAG = "drag",
  BASE_CSS = `
    :host {
      display: block;
      min-block-size: 0;
      --v-scroll-thumb-size: 16px;
      --v-scroll-thumb-offset: 3px;
    }

    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    [part="root"] {
      position: relative;
      block-size: 100%;
      min-block-size: 100%;
    }

    [part="scroll"] {
      inline-size: 100%;
      block-size: 100%;
      overflow: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
      outline: none;
    }

    [part="scroll"]::-webkit-scrollbar {
      inline-size: 0;
      block-size: 0;
      display: none;
    }

    [part="display"] {
      min-block-size: 100%;
    }

    [part="track"] {
      position: absolute;
      inset-block: 0;
      inset-inline-end: 0;
      opacity: 0;
      pointer-events: none;
      transition:
        opacity 160ms ease,
        background-color 160ms ease;
    }

    slot {
      display: contents;
    }

    b {
      display: block;
      font-weight: 400;
    }

    [hidden] {
      display: none;
    }
  `,
  STATE_MAP = new WeakMap();

const loadThemeCss = async () => {
  try {
    const { default: css_text } = await import(/* @vite-ignore */ THEME_IMPORT_PATH);

    return css_text;
  } catch (error) {
    console.warn("[v-scroll] theme css module failed to load", error);
    return "";
  }
};

const ensureTheme = (css_text) => {
  if (!css_text || document.head.querySelector(`[${STYLE_ATTR}]`)) {
    return;
  }

  const style_el = document.createElement("style");

  style_el.setAttribute(STYLE_ATTR, "1");
  style_el.textContent = css_text;
  document.head.append(style_el);
};

ensureTheme(await loadThemeCss());

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getBodyEl = () => document.body || document.documentElement;

const setBodyDrag = (value) => {
  getBodyEl().classList.toggle(BODY_DRAG, value);
};

const setHovering = (state, value) => {
  state.hovering = value;
  state.host.toggleAttribute("hovering", value);
  syncBarParts(state);
};

const syncBarParts = (state) => {
  const parts = [BAR_PART],
    is_turned =
      state.hovering || state.host.hasAttribute("active") || state.host.hasAttribute("dragging"),
    is_dragging = state.host.hasAttribute("dragging");

  if (is_turned) {
    parts.push(TURNED_PART);
  }

  if (is_dragging) {
    parts.push(DRAG_PART);
  }

  state.bar_el.setAttribute("part", parts.join(" "));
};

const setFlag = (state, flag_name, value) => {
  state.host.toggleAttribute(flag_name, value);
  syncBarParts(state);
};

const clearPulse = (state) => {
  if (!state.active_timer) {
    return;
  }

  clearTimeout(state.active_timer);
  state.active_timer = 0;
};

const setActive = (state, value) => {
  setFlag(state, "active", value);
};

const setDragging = (state, value) => {
  setFlag(state, "dragging", value);
};

const pulse = (state, sticky = false) => {
  if (!state.host.hasAttribute("scrollable")) {
    return;
  }

  clearPulse(state);
  setActive(state, true);

  if (sticky || state.drag_state) {
    return;
  }

  state.active_timer = window.setTimeout(() => {
    setActive(state, false);
    state.active_timer = 0;
  }, ACTIVE_DELAY);
};

const scheduleSync = (state) => {
  if (state.frame_id) {
    return;
  }

  state.frame_id = requestAnimationFrame(() => {
    state.frame_id = 0;
    syncMetrics(state);
  });
};

const readMetrics = (state) => {
  const viewport_size = state.scroll_el.clientHeight,
    content_size = state.scroll_el.scrollHeight,
    max_scroll = Math.max(content_size - viewport_size, 0),
    track_size = Math.max(viewport_size - BAR_GAP * 2, 0),
    thumb_size = max_scroll
      ? clamp((viewport_size / content_size) * track_size, BAR_MIN, track_size)
      : BAR_MIN,
    travel_size = Math.max(track_size - thumb_size, 0),
    scroll_ratio = max_scroll ? state.scroll_el.scrollTop / max_scroll : 0,
    thumb_offset = BAR_GAP + travel_size * scroll_ratio;

  return {
    content_size,
    max_scroll,
    scroll_ratio,
    thumb_offset,
    thumb_size,
    track_size,
    travel_size,
    viewport_size
  };
};

const syncMetrics = (state) => {
  if (!state.host.isConnected) {
    return;
  }

  const metrics = readMetrics(state),
    has_overflow = metrics.max_scroll > 0;

  state.metrics = metrics;
  state.host.toggleAttribute("scrollable", has_overflow);
  state.track_el.hidden = !has_overflow;
  state.bar_el.hidden = !has_overflow;
  state.host.style.setProperty("--v-scroll-thumb-size", `${metrics.thumb_size}px`);
  state.host.style.setProperty("--v-scroll-thumb-offset", `${metrics.thumb_offset}px`);

  if (!has_overflow) {
    clearPulse(state);
    setHovering(state, false);
    setActive(state, false);
    setDragging(state, false);
  }
};

const lockSelection = (state) => {
  const body_el = getBodyEl();

  state.prev_user_select = body_el.style.userSelect;
  body_el.style.userSelect = "none";
};

const unlockSelection = (state) => {
  const body_el = getBodyEl();

  body_el.style.userSelect = state.prev_user_select;
  state.prev_user_select = "";
};

const stopDrag = (state, pointer_id = state.drag_state?.pointer_id, silent = false) => {
  if (!state.drag_state) {
    return;
  }

  state.drag_state = null;
  unlockSelection(state);
  setBodyDrag(false);
  setDragging(state, false);

  if (pointer_id && state.bar_el.hasPointerCapture?.(pointer_id)) {
    state.bar_el.releasePointerCapture(pointer_id);
  }

  if (!silent) {
    pulse(state);
  }
};

const beginDrag = (state, event) => {
  if (event.button !== 0 || !state.host.hasAttribute("scrollable")) {
    return;
  }

  event.preventDefault();

  const { thumb_offset } = state.metrics;

  state.drag_state = {
    pointer_id: event.pointerId,
    start_offset: thumb_offset,
    start_y: event.clientY
  };

  lockSelection(state);
  setBodyDrag(true);
  setActive(state, true);
  setDragging(state, true);
  clearPulse(state);
  state.bar_el.setPointerCapture(event.pointerId);
};

const moveDrag = (state, event) => {
  if (!state.drag_state || state.drag_state.pointer_id !== event.pointerId) {
    return;
  }

  event.preventDefault();

  const delta = event.clientY - state.drag_state.start_y,
    next_offset = clamp(
      state.drag_state.start_offset + delta,
      BAR_GAP,
      BAR_GAP + state.metrics.travel_size
    ),
    ratio = state.metrics.travel_size ? (next_offset - BAR_GAP) / state.metrics.travel_size : 0;

  state.scroll_el.scrollTop = ratio * state.metrics.max_scroll;
  scheduleSync(state);
};

const createDom = (host) => {
  const shadow_root = host.shadowRoot || host.attachShadow({ mode: "open" });

  if (!shadow_root.firstChild) {
    const style_el = document.createElement("style"),
      root_el = document.createElement("section"),
      scroll_el = document.createElement("div"),
      display_el = document.createElement("div"),
      slot_el = document.createElement("slot"),
      track_el = document.createElement("i"),
      bar_el = document.createElement("b");

    style_el.textContent = BASE_CSS;
    root_el.setAttribute("part", "root");
    scroll_el.setAttribute("part", "scroll");
    scroll_el.tabIndex = 0;
    display_el.setAttribute("part", "display");
    track_el.setAttribute("aria-hidden", "true");
    track_el.setAttribute("part", TRACK_PART);
    track_el.hidden = true;
    bar_el.setAttribute("aria-hidden", "true");
    bar_el.setAttribute("part", BAR_PART);
    bar_el.hidden = true;
    display_el.append(slot_el);
    root_el.append(scroll_el, track_el, bar_el);
    scroll_el.append(display_el);
    shadow_root.append(style_el, root_el);
  }

  return {
    shadow_root,
    scroll_el: shadow_root.querySelector('[part="scroll"]'),
    display_el: shadow_root.querySelector('[part="display"]'),
    slot_el: shadow_root.querySelector("slot"),
    track_el: shadow_root.querySelector('[part~="track"]'),
    bar_el: shadow_root.querySelector('[part~="bar"]')
  };
};

const bindEvents = (state) => {
  if (state.abort_ctrl) {
    return;
  }

  const abort_ctrl = new AbortController(),
    { signal } = abort_ctrl;

  state.abort_ctrl = abort_ctrl;
  state.scroll_el.addEventListener(
    "scroll",
    () => {
      scheduleSync(state);
      pulse(state);
    },
    { passive: true, signal }
  );
  state.slot_el.addEventListener(
    "slotchange",
    () => {
      scheduleSync(state);
    },
    { signal }
  );
  state.bar_el.addEventListener(
    "pointerenter",
    () => {
      if (state.host.hasAttribute("scrollable") && !state.drag_state) {
        setHovering(state, true);
      }
    },
    { signal }
  );
  state.bar_el.addEventListener(
    "pointerleave",
    () => {
      if (!state.drag_state) {
        setHovering(state, false);
      }
    },
    { signal }
  );
  state.bar_el.addEventListener(
    "pointerdown",
    (event) => {
      beginDrag(state, event);
    },
    { signal }
  );
  state.bar_el.addEventListener(
    "pointermove",
    (event) => {
      moveDrag(state, event);
    },
    { signal }
  );
  state.bar_el.addEventListener(
    "pointerup",
    (event) => {
      stopDrag(state, event.pointerId);
    },
    { signal }
  );
  state.bar_el.addEventListener(
    "pointercancel",
    (event) => {
      stopDrag(state, event.pointerId);
    },
    { signal }
  );
  state.bar_el.addEventListener(
    "lostpointercapture",
    () => {
      stopDrag(state);
    },
    { signal }
  );
};

const mountObservers = (state) => {
  state.resize_observer.observe(state.host);
  state.resize_observer.observe(state.scroll_el);
  state.resize_observer.observe(state.display_el);
  state.mutation_observer.observe(state.host, {
    childList: true,
    characterData: true,
    subtree: true
  });
};

const unmount = (host) => {
  const state = STATE_MAP.get(host);

  if (!state) {
    return;
  }

  if (state.frame_id) {
    cancelAnimationFrame(state.frame_id);
    state.frame_id = 0;
  }

  clearPulse(state);
  setHovering(state, false);
  stopDrag(state, state.drag_state?.pointer_id, true);
  state.abort_ctrl?.abort();
  state.abort_ctrl = null;
  state.resize_observer.disconnect();
  state.mutation_observer.disconnect();
};

const mount = (host) => {
  let state = STATE_MAP.get(host);

  if (!state) {
    const dom = createDom(host);

    state = {
      ...dom,
      active_timer: 0,
      abort_ctrl: null,
      drag_state: null,
      frame_id: 0,
      host,
      hovering: false,
      metrics: {
        max_scroll: 0,
        thumb_offset: BAR_GAP,
        thumb_size: BAR_MIN,
        track_size: 0,
        travel_size: 0
      },
      mutation_observer: new MutationObserver(() => {
        scheduleSync(state);
      }),
      prev_user_select: "",
      resize_observer: new ResizeObserver(() => {
        scheduleSync(state);
      })
    };

    STATE_MAP.set(host, state);
  }

  bindEvents(state);
  mountObservers(state);
  scheduleSync(state);
};

if (!customElements.get(TAG)) {
  customElements.define(
    TAG,
    class extends HTMLElement {
      connectedCallback() {
        mount(this);
      }

      disconnectedCallback() {
        unmount(this);
      }
    }
  );
}
