import { ListNodeView, Node } from './node';
import { AbstractTable } from './table';
import { ColumnOptions } from './column-options';
import { ListTableOptions } from './table-options';

export class ListTable<T> extends AbstractTable<T> {
  public constructor(
    rootElt: HTMLElement,
    options: { columnOptions: ColumnOptions<T>[]; tableOptions: ListTableOptions<T> }
  ) {
    super(rootElt, options);

    this.init();
  }

  public addData(item: T, { position, refNodeId }: { position: 'top' | 'bottom'; refNodeId?: number }): void {
    const isAbove = position === 'top';
    const refNodeIndex = refNodeId != null ? this.nodes.findIndex((node) => node.id === refNodeId) : -1;
    const newNodeIndex =
      refNodeIndex !== -1 ? (isAbove ? refNodeIndex : refNodeIndex + 1) : isAbove ? 0 : this.nodes.length;
    const [newNode] = this.createNodes([item]);

    this.nodes.splice(newNodeIndex, 0, newNode);

    // Update initial position of next nodes
    this.nodes.slice(newNodeIndex + 1).forEach((node) => (node.initialPos = node.initialPos + 1));

    this.updateNodes();
  }

  public getNodes(): ListNodeView<T>[] {
    return this.nodes.map((node) => this.createNodeView(node));
  }

  public setData(items: T[]): void {
    this.setNodes(this.createNodes(items));
  }

  private createNodes(items: T[]): Node<T>[] {
    return items.map((item, i) => ({
      id: this.generateId(),
      initialPos: i,
      isExpanded: false,
      isHidden: false,
      isLeaf: true,
      isMatching: true,
      isSelected: false,
      level: 0,
      value: item
    }));
  }

  private createNodeView(node: Node<T>): ListNodeView<T> {
    return { id: node.id, isSelected: node.isSelected, value: node.value };
  }
}
