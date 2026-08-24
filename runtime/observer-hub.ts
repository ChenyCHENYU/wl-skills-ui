/**
 * wl-skills-ui 运行时共享观察器。
 *
 * 每个 Document 只创建一个 MutationObserver，每个 Window 只创建一个
 * ResizeObserver。各 guard 仍负责过滤记录和调度业务刷新，Hub 只负责实例复用、
 * target 分发与无订阅自动断开。
 */

type MutationSubscription = {
  callback: MutationCallback;
  options: MutationObserverInit;
};

type MutationHub = {
  observer?: MutationObserver;
  subscriptions: Map<symbol, MutationSubscription>;
};

type ResizeHub = {
  callbacks: Map<Element, Map<symbol, ResizeObserverCallback>>;
  observer?: ResizeObserver;
};

export interface ObserverHubStats {
  mutationObserverCount: number;
  mutationSubscribers: number;
  resizeObserverCount: number;
  resizeSubscribers: number;
  resizeTargets: number;
}

const mutationHubs = new WeakMap<Document, MutationHub>();
const resizeHubs = new WeakMap<Window, ResizeHub>();

function reportAsync(error: unknown): void {
  setTimeout(() => {
    throw error;
  }, 0);
}

function mutationOptions(
  subscriptions: Iterable<MutationSubscription>,
): MutationObserverInit {
  const values = [...subscriptions];
  const options: MutationObserverInit = {
    attributes: values.some((item) => item.options.attributes),
    characterData: values.some((item) => item.options.characterData),
    childList: values.some((item) => item.options.childList),
    subtree: values.some((item) => item.options.subtree),
  };

  const attributeSubscriptions = values.filter(
    (item) => item.options.attributes,
  );
  if (
    attributeSubscriptions.length > 0 &&
    attributeSubscriptions.every((item) => item.options.attributeFilter)
  ) {
    options.attributeFilter = [
      ...new Set(
        attributeSubscriptions.flatMap(
          (item) => item.options.attributeFilter || [],
        ),
      ),
    ];
  }
  return options;
}

function reconnectMutationHub(doc: Document, hub: MutationHub): void {
  hub.observer?.disconnect();
  if (hub.subscriptions.size === 0) {
    hub.observer = undefined;
    return;
  }

  const Observer =
    doc.defaultView?.MutationObserver ||
    (typeof MutationObserver !== "undefined" ? MutationObserver : undefined);
  if (!Observer || !doc.documentElement) return;
  hub.observer ??= new Observer((records, observer) => {
    for (const { callback } of [...hub.subscriptions.values()]) {
      try {
        callback(records, observer);
      } catch (error) {
        reportAsync(error);
      }
    }
  });
  hub.observer.observe(
    doc.documentElement,
    mutationOptions(hub.subscriptions.values()),
  );
}

export function subscribeDocumentMutations(
  doc: Document,
  callback: MutationCallback,
  options: MutationObserverInit,
): () => void {
  let hub = mutationHubs.get(doc);
  if (!hub) {
    hub = { subscriptions: new Map() };
    mutationHubs.set(doc, hub);
  }
  const id = Symbol("mutation-subscription");
  hub.subscriptions.set(id, { callback, options });
  reconnectMutationHub(doc, hub);

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    hub?.subscriptions.delete(id);
    if (hub) reconnectMutationHub(doc, hub);
  };
}

function ensureResizeObserver(view: Window, hub: ResizeHub): ResizeObserver | null {
  if (hub.observer) return hub.observer;
  const Observer = (
    view as Window & { ResizeObserver?: typeof ResizeObserver }
  ).ResizeObserver;
  if (!Observer) return null;
  hub.observer = new Observer((entries, observer) => {
    for (const entry of entries) {
      const callbacks = hub.callbacks.get(entry.target);
      if (!callbacks) continue;
      for (const callback of [...callbacks.values()]) {
        try {
          callback([entry], observer);
        } catch (error) {
          reportAsync(error);
        }
      }
    }
  });
  return hub.observer || null;
}

export function subscribeElementResize(
  element: Element,
  callback: ResizeObserverCallback,
): () => void {
  const view = element.ownerDocument.defaultView;
  if (!view && typeof ResizeObserver === "undefined") return () => undefined;
  const observerWindow = view || (globalThis as unknown as Window);
  let hub = resizeHubs.get(observerWindow);
  if (!hub) {
    hub = { callbacks: new Map() };
    resizeHubs.set(observerWindow, hub);
  }
  const observer = ensureResizeObserver(observerWindow, hub);
  if (!observer) return () => undefined;

  const id = Symbol("resize-subscription");
  const callbacks = hub.callbacks.get(element) || new Map();
  const firstTargetSubscriber = callbacks.size === 0;
  callbacks.set(id, callback);
  hub.callbacks.set(element, callbacks);
  if (firstTargetSubscriber) observer.observe(element);

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    const targetCallbacks = hub?.callbacks.get(element);
    targetCallbacks?.delete(id);
    if (targetCallbacks?.size === 0) {
      hub?.callbacks.delete(element);
      hub?.observer?.unobserve?.(element);
    }
    if (hub?.callbacks.size === 0) {
      hub.observer?.disconnect();
      hub.observer = undefined;
    }
  };
}

export function getObserverHubStats(doc: Document): ObserverHubStats {
  const mutationHub = mutationHubs.get(doc);
  const resizeHub = doc.defaultView
    ? resizeHubs.get(doc.defaultView)
    : undefined;
  let resizeSubscribers = 0;
  for (const callbacks of resizeHub?.callbacks.values() || []) {
    resizeSubscribers += callbacks.size;
  }
  return {
    mutationObserverCount: mutationHub?.observer ? 1 : 0,
    mutationSubscribers: mutationHub?.subscriptions.size || 0,
    resizeObserverCount: resizeHub?.observer ? 1 : 0,
    resizeSubscribers,
    resizeTargets: resizeHub?.callbacks.size || 0,
  };
}
