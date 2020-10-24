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

  public addData(obj: T, { position, refNodeId }: { position: 'top' | 'bottom'; refNodeId?: number }): void {
    const isAbove = position === 'top';
    const refNodeIndex = refNodeId ? this.nodes.findIndex((node) => node.id === refNodeId) : -1;
    const newNodeIndex =
      refNodeIndex !== -1 ? (isAbove ? refNodeIndex : refNodeIndex + 1) : isAbove ? 0 : this.nodes.length;
    const [newNode] = this.createNodes([obj]);

    this.nodes.splice(newNodeIndex, 0, newNode);

    this.updateNodes();
  }

  public getNodes(): ListNodeView<T>[] {
    return this.nodes.map((node) => this.createNodeView(node));
  }

  public setData(objs: T[]): void {
    this.setNodes(this.createNodes(objs));
  }

  protected dispatchEventClickNode(originalEvent: Event, node: Node<T>): void {
    const event = DomUtils.createEvent('onClickNode', { event: originalEvent, node: this.createNodeView(node) });
    this.rootElt.dispatchEvent(event);
  }

  private createNodes(objs: T[]): Node<T>[] {
    return objs.map((obj) => ({
      id: this.generateId(),
      isExpanded: false,
      isHidden: false,
      isLeaf: true,
      isMatching: true,
      isSelected: false,
      level: 0,
      value: obj
    }));
  }

  private createNodeView(node: Node<T>): ListNodeView<T> {
    return { id: node.id, value: node.value, isSelected: node.isSelected };
  }
}