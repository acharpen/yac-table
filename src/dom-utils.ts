export enum EventListenerManageMode {
  ADD,
  REMOVE
}

export class DomUtils {
  public static createDiv(classes?: string[]): HTMLElement {
    return DomUtils.createElt('div', classes);
  }

  public static createElt(tagName: string, classes?: string[]): HTMLElement {
    const elt = document.createElement(tagName);

    if (classes) {
      elt.classList.add(...classes);
    }

    return elt;
  }

  public static createEvent<T>(eventName: string, arg?: T): CustomEvent<T> {
    return new CustomEvent(eventName, { detail: arg });
  }

  public static getEltByClassName(elts: HTMLCollection, className: string): HTMLElement | undefined {
    const eltsLength = elts.length;

    for (let i = 0; i < eltsLength; i++) {
      const elt = elts[i];

      if (elt.classList.contains(className)) {
        return elt as HTMLElement;
      }
    }

    return undefined;
  }

  public static getEltComputedWidth(elt: HTMLElement): number {
    return parseFloat(getComputedStyle(elt, undefined).getPropertyValue('width').replace('px', ''));
  }

  public static getEltWidth(elt: HTMLElement): number {
    return parseFloat(elt.style.width.replace('px', ''));
  }

  public static manageEventListener<K extends keyof HTMLElementEventMap>(
    elt: HTMLElement,
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => unknown,
    mode: EventListenerManageMode
  ): void {
    if (mode === EventListenerManageMode.ADD) {
      elt.addEventListener(type, listener);
    } else {
      elt.removeEventListener(type, listener);
    }
  }
}
