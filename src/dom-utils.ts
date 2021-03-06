export class DomUtils {
  public static createElt(tagName: string, ...classes: string[]): HTMLElement {
    const elt = document.createElement(tagName);
    if (classes.length > 0) elt.classList.add(...classes);

    return elt;
  }

  public static getComputedHeight(elt: Element): number {
    return parseFloat(getComputedStyle(elt).getPropertyValue('height').replace('px', ''));
  }

  public static getComputedWidth(elt: Element): number {
    return parseFloat(getComputedStyle(elt).getPropertyValue('width').replace('px', ''));
  }

  public static getRenderedSize(containerElt: HTMLElement, elt: HTMLElement): { height: number; width: number } {
    const clone = elt.cloneNode(true) as HTMLElement;
    clone.style.visibility = 'hidden';

    containerElt.appendChild(clone);

    const height = DomUtils.getComputedHeight(clone);
    const width = DomUtils.getComputedWidth(clone);

    containerElt.removeChild(clone);

    return { height, width };
  }

  public static getWidth(elt: HTMLElement): number {
    return parseFloat(elt.style.width.replace('px', ''));
  }

  public static withPx(width: number): string {
    return `${width}px`;
  }
}
