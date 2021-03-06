import { Node, TreeNode, TreeNodeView } from './node';
import { AbstractTable } from './table';
import { Column } from './column';
import { ColumnOptions } from './column-options';
import { ColumnWidthUnit } from './column-utils';
import { DomUtils } from './dom-utils';
import { TreeTableOptions } from './table-options';

export class TreeTable<T> extends AbstractTable<T> {
  private static readonly EXPAND_TOGGLER_CLASS: string = `${AbstractTable.VENDOR_PREFIX}-expand-toggler`;

  private readonly childNodeOffset: number;
  private readonly expandTogglerWidth: number;

  private expandTogglerColumnIndex: number | null;

  public constructor(
    rootElt: HTMLElement,
    options: { columnOptions: ColumnOptions<T>[]; tableOptions: TreeTableOptions<T> }
  ) {
    super(rootElt, options);

    this.childNodeOffset = options.tableOptions.childNodeOffset;
    this.expandTogglerColumnIndex =
      options.tableOptions.expandTogglerColumnIndex < options.columnOptions.length
        ? options.tableOptions.expandTogglerColumnIndex
        : 0;

    this.init();

    this.expandTogglerWidth = this.computeExpandTogglerWidth();
  }

  public addData(
    item: TreeNode<T>,
    options: { position: 'top' | 'bottom'; refNodeId?: number } | { position: 'child' | 'parent'; refNodeId: number }
  ): void {
    const isAbove = options.position === 'top' || options.position === 'parent';
    const refNodeIndex = options.refNodeId != null ? this.nodes.findIndex((node) => node.id === options.refNodeId) : -1;
    const newNodeIndex =
      refNodeIndex !== -1 ? (isAbove ? refNodeIndex : refNodeIndex + 1) : isAbove ? 0 : this.nodes.length;
    const refNode = isAbove ? this.nodes[newNodeIndex] : this.nodes[newNodeIndex - 1];
    const [newNode] = this.createNodes([item]);

    // Insert new node
    this.nodes.splice(newNodeIndex, 0, newNode);

    // Set new node's level
    newNode.level =
      options.position === 'top' || options.position === 'bottom' || options.position === 'parent'
        ? refNode.level
        : refNode.level + 1;

    // Set new node's visibility
    newNode.isHidden =
      options.position === 'top' || options.position === 'bottom' || options.position === 'parent'
        ? refNode.isHidden
        : !refNode.isExpanded;

    // Update new node's children
    if (options.position === 'parent') {
      const nodesLength = this.nodes.length;
      let nextnodeIndex = refNodeIndex;

      do {
        this.nodes[nextnodeIndex].level++;
        nextnodeIndex++;
      } while (nextnodeIndex < nodesLength && this.nodes[nextnodeIndex].level > newNode.level);
    }

    // Update nodes
    this.updateNodes();
  }

  public collapseNodes(nodeIds: number[]): void {
    this.toggleNodesVisibility(nodeIds, { isExpanded: false });
  }

  public deselectNodes(
    nodeIds: number[],
    options: { onlyMatching: boolean; withChildren: false | true | number; withParents: false | true | number } = {
      onlyMatching: false,
      withChildren: false,
      withParents: false
    }
  ): void {
    super.deselectNodes(
      options.withChildren === false && options.withParents === false
        ? nodeIds
        : this.getNodesWithParentsAndChildren(nodeIds, options),
      options
    );
  }

  public expandNodes(nodeIds: number[]): void {
    this.toggleNodesVisibility(nodeIds, { isExpanded: true });
  }

  public getNodes(): TreeNodeView<T>[] {
    return this.nodes.map((node) => this.createNodeView(node));
  }

  public selectNodes(
    nodeIds: number[],
    options: { onlyMatching: boolean; withChildren: false | true | number; withParents: false | true | number } = {
      onlyMatching: false,
      withChildren: false,
      withParents: false
    }
  ): void {
    super.selectNodes(
      options.withChildren === false && options.withParents === false
        ? nodeIds
        : this.getNodesWithParentsAndChildren(nodeIds, options),
      options
    );
  }

  public setData(items: TreeNode<T>[]): void {
    this.setNodes(this.createNodes(items));
  }

  protected createTableCell(column: Column<T>, ctx: { nodeIndex: number }): HTMLElement {
    const elt = super.createTableCell(column, ctx);

    if (this.expandTogglerColumnIndex !== null && column.id === this.columns[this.expandTogglerColumnIndex].id) {
      this.addExpandTogglerElt(elt, ctx.nodeIndex);
    }

    return elt;
  }

  protected dispatchEventClickNode(originalEvent: Event, node: Node<T>): void {
    const event = DomUtils.createEvent('onClickNode', { event: originalEvent, node: this.createNodeView(node) });
    this.rootElt.dispatchEvent(event);
  }

  protected handleAddColumn(
    columnToAddOption: Omit<ColumnOptions<T>, 'width'> & { width: { value: number; unit: ColumnWidthUnit } },
    newColumnIndex: number
  ): void {
    if (this.expandTogglerColumnIndex !== null && newColumnIndex <= this.expandTogglerColumnIndex) {
      this.expandTogglerColumnIndex = this.expandTogglerColumnIndex + 1;
    }

    super.handleAddColumn(columnToAddOption, newColumnIndex);
  }

  protected handleDeleteColumn(columnIndex: number): void {
    if (this.expandTogglerColumnIndex !== null && columnIndex === this.expandTogglerColumnIndex) {
      this.expandTogglerColumnIndex = null;
    }

    super.handleDeleteColumn(columnIndex);
  }

  protected updateVisibleNodes(): void {
    super.updateVisibleNodes();

    if (this.expandTogglerColumnIndex !== null) {
      for (let i = 0, len = this.visibleNodeIndexes.length; i < len; i++) {
        const node = this.nodes[this.visibleNodeIndexes[i]];
        const firstCellElt = this.tableNodeElts[i].children[this.expandTogglerColumnIndex];
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
  }

  private addExpandTogglerElt(cellElt: HTMLElement, nodeIndex: number): void {
    cellElt.insertAdjacentElement('afterbegin', this.createExpandToggler(nodeIndex));
  }

  private computeExpandTogglerWidth(): number {
    const elts = this.tableBodyElt.getElementsByClassName(TreeTable.EXPAND_TOGGLER_CLASS);

    return elts.length > 0 ? DomUtils.getEltComputedWidth(elts[0] as HTMLElement) : 0;
  }

  private createExpandToggler(nodeIndex: number): HTMLElement {
    const elt = DomUtils.createDiv(TreeTable.EXPAND_TOGGLER_CLASS);
    elt.appendChild(DomUtils.createElt('i'));
    elt.addEventListener('mouseup', (event) => {
      event.stopPropagation();

      this.onToggleNode(event, nodeIndex);
    });

    return elt;
  }

  private createNodes(items: TreeNode<T>[]): Node<T>[] {
    const nodes = [];
    const stack = [];

    for (let i = items.length - 1; i >= 0; i--) {
      stack.push({ treeNode: items[i], level: 0 });
    }

    while (stack.length > 0) {
      const { treeNode, level } = stack.pop() as { treeNode: TreeNode<T>; level: number };
      const childItems = treeNode.children;
      const childItemsLength = childItems.length;
      const nextLevel = level + 1;

      nodes.push({
        level,
        id: this.generateId(),
        isExpanded: false,
        isHidden: level > 0,
        isLeaf: childItemsLength === 0,
        isMatching: true,
        isSelected: false,
        value: treeNode.value
      });

      for (let i = childItemsLength - 1; i >= 0; i--) {
        stack.push({ treeNode: childItems[i], level: nextLevel });
      }
    }

    return nodes;
  }

  private createNodeView(node: Node<T>): TreeNodeView<T> {
    return {
      id: node.id,
      value: node.value,
      isMatching: node.isMatching,
      isSelected: node.isSelected,
      isExpanded: node.isExpanded,
      level: node.level
    };
  }

  private dispatchEventToggleNode(originalEvent: Event, node: Node<T>): void {
    const event = DomUtils.createEvent('onToggleNode', { event: originalEvent, node: this.createNodeView(node) });
    this.rootElt.dispatchEvent(event);
  }

  private getNodesWithParentsAndChildren(
    nodeIds: number[],
    { withChildren, withParents }: { withChildren: false | true | number; withParents: false | true | number }
  ): number[] {
    const allNodeIds = new Set<number>(nodeIds);
    const nodesLength = this.nodes.length;
    const targetNodes = nodeIds.map((nodeId) => {
      const nodeIndex = this.nodes.findIndex((node) => node.id === nodeId);

      return {
        nodeIndex,
        node: this.nodes[nodeIndex]
      };
    });

    const addChildren = ({ node, nodeIndex }: { node: Node<T>; nodeIndex: number }, maxChildren?: number): void => {
      let count = maxChildren ?? -1;
      let nextNodeIndex = nodeIndex + 1;

      while (count !== 0 && nextNodeIndex < nodesLength && this.nodes[nextNodeIndex].level > node.level) {
        allNodeIds.add(this.nodes[nextNodeIndex].id);
        count--;
        nextNodeIndex++;
      }
    };

    const addParent = ({ node, nodeIndex }: { node: Node<T>; nodeIndex: number }, maxParent?: number): void => {
      let count = maxParent ?? -1;
      let previousNodeIndex = nodeIndex - 1;

      while (count !== 0 && previousNodeIndex >= 0) {
        const previousNode = this.nodes[previousNodeIndex];
        if (previousNode.level < node.level) {
          allNodeIds.add(previousNode.id);

          // A node has only one parent at level 0
          count = previousNode.level === 0 ? 0 : count - 1;
        }
        previousNodeIndex--;
      }
    };

    if (withChildren !== false) {
      switch (withChildren) {
        case true:
          targetNodes.forEach((targetNode) => addChildren(targetNode));
          break;

        default:
          targetNodes.forEach((targetNode) => addChildren(targetNode, withChildren));
      }
    }

    if (withParents !== false) {
      switch (withParents) {
        case true:
          targetNodes.forEach((targetNode) => addParent(targetNode));
          break;

        default:
          targetNodes.forEach((targetNode) => addParent(targetNode, withParents));
      }
    }

    return [...allNodeIds];
  }

  private onToggleNode(event: Event, nodeIndex: number): void {
    this.dispatchEventToggleNode(event, this.nodes[this.visibleNodeIndexes[nodeIndex]]);
  }

  private toggleNodesVisibility(nodeIds: number[], { isExpanded }: { isExpanded: boolean }): void {
    const nodeIndexes: number[] = [];
    const nodesLength = this.nodes.length;

    const aux = (node: Node<T>, nodeIndex: number): void => {
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
