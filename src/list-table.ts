import { ColumnOptions } from './column-options';
import { DomUtils } from './dom-utils';
import { ListNodeView, Node } from './node';
import { AbstractTable } from './table';
import { ListTableOptions } from './table-options';

export class ListTable<T extends object> extends AbstractTable<T> {
  public constructor(
    rootElt: HTMLElement,
    options: { columnOptions: ColumnOptions<T>[]; tableOptions: ListTableOptions<T> }
  ) {
    super(rootElt, options);
  }

  public getNodes(): ListNodeView<T>[] {
    return this.nodes.map((node) => this.createNodeView(node));
  }

  public setData(list: T[]): void {
    this.setTable(this.createNodes(list));
  }

  protected dispatchEventClickNode(originalEvent: Event, node: Node<T>): void {
    const event = DomUtils.createEvent('onClickNode', { event: originalEvent, node: this.createNodeView(node) });
    this.rootElt.dispatchEvent(event);
  }

  private createNodes(list: T[]): Node<T>[] {
    return list.map((elt) => ({
      id: this.generateId(),
      isExpanded: false,
      isHidden: false,
      isLeaf: true,
      isMatching: true,
      isSelected: false,
      level: 0,
      value: elt
    }));
  }

  private createNodeView(node: Node<T>): ListNodeView<T> {
    return { id: node.id, value: node.value, isSelected: node.isSelected };
  }
}
