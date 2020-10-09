import { Column } from './column';
import { ColumnOptions } from './column-options';
import { DomUtils, EventListenerManageMode } from './dom-utils';
import { Node, TreeNode, TreeNodeView } from './node';
import { AbstractTable } from './table';
import { TreeTableOptions } from './table-options';

export class TreeTable<T extends object> extends AbstractTable<T> {
  private static readonly EXPAND_TOGGLER_CLASS: string = `${AbstractTable.VENDOR_PREFIX}-expand-toggler`;

  private readonly childNodeOffset: number;
  private readonly expandTogglerWidth: number;

  public constructor(
    rootElt: HTMLElement,
    options: { columnOptions: ColumnOptions<T>[]; tableOptions: TreeTableOptions<T> }
  ) {
    super(rootElt, options);

    this.childNodeOffset = options.tableOptions.childNodeOffset;
    this.expandTogglerWidth = this.computeExpandTogglerWidth();

    this.manageListenersOnNodeToggles(EventListenerManageMode.ADD);
  }

  public collapseNodes(nodeIds: number[]): void {
    this.toggleNodesVisibility(nodeIds, { isExpanded: false });
  }

  public destroy(): void {
    super.destroy();

    this.manageListenersOnNodeToggles(EventListenerManageMode.REMOVE);
  }

  public expandNodes(nodeIds: number[]): void {
    this.toggleNodesVisibility(nodeIds, { isExpanded: true });
  }

  public getNodes(): TreeNodeView<T>[] {
    return this.nodes.map((node) => this.createNodeView(node));
  }

  public setData(items: TreeNode<T>[]): void {
    this.setTable(this.createNodes(items));
  }

  protected createTableCell(column: Column<T>): HTMLElement {
    const elt = super.createTableCell(column);

    if (column.id === this.columns[0].id) {
      elt.insertAdjacentElement('afterbegin', this.createExpandToggler());
    }

    return elt;
  }

  protected dispatchEventClickNode(originalEvent: Event, node: Node<T>): void {
    const event = DomUtils.createEvent('onClickNode', { event: originalEvent, node: this.createNodeView(node) });
    this.rootElt.dispatchEvent(event);
  }

  protected updateVisibleNodes(): void {
    super.updateVisibleNodes();

    const visibleNodesLength = this.visibleNodeIndexes.length;

    for (let i = 0; i < visibleNodesLength; i++) {
      const node = this.nodes[this.visibleNodeIndexes[i]];
      const firstCellElt = this.tableNodeElts[i].children[0];
      const cellContentElt = firstCellElt.lastElementChild as HTMLElement;
      const expandTogglerElt = firstCellElt.firstElementChild as HTMLElement;
      const nodeOffset = this.childNodeOffset * node.level + (node.isLeaf ? this.expandTogglerWidth : 0);

      if (node.isLeaf) {
        cellContentElt.style.marginLeft = `${nodeOffset}px`;
        expandTogglerElt.classList.add('hidden');
      } else {
        cellContentElt.style.marginLeft = '0px';
        expandTogglerElt.classList.remove('hidden');
        expandTogglerElt.style.marginLeft = `${nodeOffset}px`;

        if (node.isExpanded) {
          (expandTogglerElt.firstElementChild as HTMLElement).classList.add('active');
        } else {
          (expandTogglerElt.firstElementChild as HTMLElement).classList.remove('active');
        }
      }
    }
  }

  private computeExpandTogglerWidth(): number {
    const elts = this.tableBodyElt.getElementsByClassName(TreeTable.EXPAND_TOGGLER_CLASS);

    return elts.length > 0 ? DomUtils.getEltComputedWidth(elts[0] as HTMLElement) : 0;
  }

  private createExpandToggler(): HTMLElement {
    const elt = DomUtils.createDiv([TreeTable.EXPAND_TOGGLER_CLASS]);
    elt.appendChild(DomUtils.createElt('i'));

    return elt;
  }

  private createNodes(items: TreeNode<T>[]): Node<T>[] {
    const itemsLength = items.length;
    const nodes = [];
    const stack = [];

    for (let i = itemsLength - 1; i >= 0; i--) {
      stack.push({ item: items[i], level: 0 });
    }

    while (stack.length > 0) {
      const { item, level } = stack.pop() as { item: TreeNode<T>; level: number };
      const childItems = item.children;
      const childItemsLength = childItems.length;
      const nextLevel = level + 1;

      nodes.push({
        level,
        id: this.generateId(),
        isExpanded: false,
        isHidden: level > 0,
        isLeaf: item.children.length === 0,
        isMatching: true,
        isSelected: false,
        value: item.value
      });

      for (let i = childItemsLength - 1; i >= 0; i--) {
        stack.push({ item: childItems[i], level: nextLevel });
      }
    }

    return nodes;
  }

  private createNodeView(node: Node<T>): TreeNodeView<T> {
    return { id: node.id, value: node.value, isSelected: node.isSelected, isExpanded: node.isExpanded };
  }

  private dispatchEventToggleNode(originalEvent: Event, node: Node<T>): void {
    const event = DomUtils.createEvent('onToggleNode', { event: originalEvent, node: this.createNodeView(node) });
    this.rootElt.dispatchEvent(event);
  }

  private manageListenersOnNodeToggles(mode: EventListenerManageMode): void {
    this.tableNodeElts.forEach((nodeElt, i) => {
      DomUtils.manageEventListener(
        nodeElt.firstElementChild!.firstElementChild as HTMLElement,
        'mouseup',
        (event) => {
          event.stopPropagation();

          this.onToggleNode(event, i);
        },
        mode
      );
    });
  }

  private onToggleNode(event: Event, nodeIndex: number): void {
    this.dispatchEventToggleNode(event, this.nodes[this.visibleNodeIndexes[nodeIndex]]);
  }

  private toggleNodesVisibility(nodeIds: number[], { isExpanded }: { isExpanded: boolean }): void {
    const nodeIndexes: number[] = [];
    const nodesLength = this.nodes.length;

    const aux = (node: Node<T>, nodeIndex: number) => {
      let nextnodeIndex = nodeIndex + 1;

      while (nextnodeIndex < nodesLength && this.nodes[nextnodeIndex].level > node.level) {
        if (this.nodes[nextnodeIndex].level === node.level + 1) {
          this.nodes[nextnodeIndex].isHidden = !isExpanded || !node.isExpanded;
          aux(this.nodes[nextnodeIndex], nextnodeIndex);
        }
        nextnodeIndex++;
      }
    };

    if (nodeIds.length > 0) {
      Array.prototype.push.apply(
        nodeIndexes,
        nodeIds.map((nodeId) => this.nodes.findIndex((node) => node.id === nodeId)).filter((i) => i !== -1)
      );
    } else {
      for (let i = 0; i < nodesLength; i++) {
        if (!this.nodes[i].isLeaf) {
          nodeIndexes.push(i);
        }
      }
    }

    nodeIndexes.forEach((i) => {
      const node = this.nodes[i];
      node.isExpanded = isExpanded;

      aux(node, i);
    });

    this.setActiveNodeIndexes();

    this.updateVisibleNodes();
  }
}
