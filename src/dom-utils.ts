export class DomUtils {
  public static createDiv(...classes: string[]): HTMLElement {
    return DomUtils.createElt('div', ...classes);
  }

  public static createElt(tagName: string, ...classes: string[]): HTMLElement {
    const elt = document.createElement(tagName);

    if (classes.length > 0) {
      elt.classList.add(...classes);
    }

    return elt;
  }

  public static createEvent<T>(eventName: string, arg?: T): CustomEvent<T> {
    return new CustomEvent(eventName, { detail: arg });
  }

  public static getEltByClassName(elts: HTMLCollection, className: string): HTMLElement | null {
    for (let i = 0, len = elts.length; i < len; i++) {
      const elt = elts[i];

      if (elt.classList.contains(className)) {
        return elt as HTMLElement;
      }
    }

    return null;
  }

  public static getEltComputedWidth(elt: HTMLElement): number {
    return parseFloat(getComputedStyle(elt).getPropertyValue('width').replace('px', ''));
  }

  public static getEltWidth(elt: HTMLElement): number {
    return parseFloat(elt.style.width.replace('px', ''));
  }
}
