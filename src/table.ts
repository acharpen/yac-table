import { Column, ColumnView } from './column';
import { ColumnOptions } from './column-options';
import { DomUtils, EventListenerManageMode } from './dom-utils';
import { ListNodeView, Node, TreeNode, TreeNodeView } from './node';
import { SortMode } from './sort-utils';
import { ListTableOptions, TableOptions, TreeTableOptions } from './table-options';

// ////////////////////////////////////////////////////////////////////////////
// Generic Table
// ////////////////////////////////////////////////////////////////////////////

abstract class AbstractTable<T> {
  protected static readonly VENDOR_PREFIX: string = 'yac-table';

  private static readonly BODY_CLASS: string = `${AbstractTable.VENDOR_PREFIX}-body`;
  private static readonly CELL_CLASS: string = `${AbstractTable.VENDOR_PREFIX}-cell`;
  private static readonly CELL_CONTENT_CLASS: string = `${AbstractTable.VENDOR_PREFIX}-cell-content`;
  private static readonly HEADER_CLASS: string = `${AbstractTable.VENDOR_PREFIX}-header`;
  private static readonly RESIZE_HANDLE_CLASS: string = `${AbstractTable.VENDOR_PREFIX}-resize-handle`;
  private static readonly ROW_CLASS: string = `${AbstractTable.VENDOR_PREFIX}-row`;
  private static readonly SORT_ASC_HANDLE_CLASS: string = `${AbstractTable.VENDOR_PREFIX}-sort-asc-handle`;
  private static readonly SORT_DESC_HANDLE_CLASS: string = `${AbstractTable.VENDOR_PREFIX}-sort-desc-handle`;

  private static readonly COLUMN_MIN_WIDTH: number = 40;
  private static readonly INITIAL_COLUMN_WIDTH: string = '0px';
  private static readonly VIRTUAL_SCROLL_PADDING: number = 2;

  protected readonly rootElt: HTMLElement;
  protected readonly tableBodyElt: HTMLElement;
  protected readonly tableHeaderElt: HTMLElement;
  protected readonly tableHeaderRowElt: HTMLElement;
  protected readonly tableNodeElts: HTMLElement[];

  protected readonly columns: Column<T>[];
  protected readonly options: TableOptions;
  protected readonly virtualNodesCount: number;

  protected nodes: Node<T>[];
  protected visibleNodeIndexes: number[];

  private activeNodeIndexes: number[];
  private counter: number;
  private currentScrollX: number;
  private currentScrollY: number;
  private isResizing: boolean;

  protected constructor(
    rootElt: HTMLElement,
    { columnOptions, tableOptions }: { columnOptions: ColumnOptions<T>[]; tableOptions: TableOptions }
  ) {
    this.activeNodeIndexes = [];
    this.columns = columnOptions.map((column, i) => ({ ...column, id: i, sortMode: 'default' }));
    this.counter = 0;
    this.currentScrollX = 0;
    this.currentScrollY = 0;
    this.isResizing = false;
    this.nodes = [];
    this.options = { ...tableOptions, frozenFirstColumn: tableOptions.frozenFirstColumn && this.columns.length > 1 };
    this.virtualNodesCount = this.options.visibleNodesCount + AbstractTable.VIRTUAL_SCROLL_PADDING * 2;
    this.visibleNodeIndexes = [];

    this.rootElt = rootElt;
    this.tableBodyElt = this.createTableBody();
    this.tableHeaderElt = this.createTableHeader();
    this.tableHeaderRowElt = this.createTableHeaderRow();
    this.tableNodeElts = this.createTableNodes();

    this.buildTable();

    this.setInitialColumnsWidth();

    this.setInitialTableWidth();

    if (this.options.frozenFirstColumn) {
      this.freezeFirstColumn();
    }

    this.manageListenersOnTableHeader(EventListenerManageMode.ADD);
    this.manageListenersOnResizeHandles(EventListenerManageMode.ADD);
    this.manageListenersOnSortHandles(EventListenerManageMode.ADD);
    this.manageListenersOnTableBody(EventListenerManageMode.ADD);
    this.manageListenersOnTableNodes(EventListenerManageMode.ADD);

    this.hideUnusedTableNodeElts();
  }

  // ////////////////////////////////////////////////////////////////////////////

  public deselectNodes(nodeIds: number[]): void {
    this.toggleNodesSelection(nodeIds, false);
  }

  public destroy(): void {
    // Remove listeners
    this.manageListenersOnTableNodes(EventListenerManageMode.REMOVE);
    this.manageListenersOnTableBody(EventListenerManageMode.REMOVE);
    this.manageListenersOnSortHandles(EventListenerManageMode.REMOVE);
    this.manageListenersOnResizeHandles(EventListenerManageMode.REMOVE);
    this.manageListenersOnTableHeader(EventListenerManageMode.REMOVE);
  }

  public filter(matchFn: (value: T) => boolean): void {
    const nodesLength = this.nodes.length;

    for (let i = nodesLength - 1; i >= 0; i--) {
      const node = this.nodes[i];
      node.isMatching = matchFn(node.value);

      if (!node.isMatching && !node.isLeaf) {
        let nextnodeIndex = i + 1;

        while (nextnodeIndex < nodesLength && this.nodes[nextnodeIndex].level > node.level) {
          if (this.nodes[nextnodeIndex].isMatching) {
            node.isMatching = true;
            break;
          }
          nextnodeIndex++;
        }
      }
    }

    this.setNodes(this.nodes);
  }

  public selectNodes(nodeIds: number[]): void {
    this.toggleNodesSelection(nodeIds, true);
  }

  public sort(columnField: keyof T, mode: SortMode, compareFn: (a: T, b: T) => number): void {
    const targetColumn = this.columns.find((column) => column.field === columnField);

    if (targetColumn && targetColumn.sortFeature) {
      const compareWithOrderFn = (a: T, b: T) => compareFn(a, b) * (mode === 'desc' ? -1 : 1);
      const nodesLength = this.nodes.length;
      const rootNodes = [];
      const sortedChildrenByParentNodeId = new Map<number, Node<T>[]>();

      for (let i = 0; i < nodesLength; i++) {
        const node = this.nodes[i];
        const children = [];
        let nextnodeIndex = i + 1;

        while (nextnodeIndex < nodesLength && this.nodes[nextnodeIndex].level > node.level) {
          if (this.nodes[nextnodeIndex].level === node.level + 1) {
            children.push(this.nodes[nextnodeIndex]);
          }
          nextnodeIndex++;
        }

        sortedChildrenByParentNodeId.set(
          node.id,
          children.sort((a, b) => compareWithOrderFn(a.value, b.value) * -1)
        );

        if (node.level === 0) {
          rootNodes.push(node);
        }
      }

      const sortedNodes = [];
      const stack = rootNodes.sort((a, b) => compareWithOrderFn(a.value, b.value) * -1);

      while (stack.length > 0) {
        const node = stack.pop() as Node<T>;

        sortedNodes.push(node);
        Array.prototype.push.apply(stack, sortedChildrenByParentNodeId.get(node.id) as Node<T>[]);
      }

      this.setTable(sortedNodes);

      this.setColumnSortMode(targetColumn, mode);
    }
  }

  public updateNodeHeight(nodeHeight: number): void {
    this.options.nodeHeight = nodeHeight;

    this.tableNodeElts.forEach((nodeElt) => {
      nodeElt.style.height = `${this.options.nodeHeight}px`;
    });

    this.setTableBodyHeight();
  }

  // ////////////////////////////////////////////////////////////////////////////

  protected abstract dispatchEventClickNode(originalEvent: Event, node: Node<T>): void;

  // ////////////////////////////////////////////////////////////////////////////

  protected createTableCell(column: Column<T>): HTMLElement {
    const elt = DomUtils.createDiv([AbstractTable.CELL_CLASS]);
    elt.style.width = this.computeInitialColumnWidth(column);
    elt.appendChild(DomUtils.createDiv([AbstractTable.CELL_CONTENT_CLASS, column.align]));

    if (column.sortFeature) {
      elt.classList.add('sortable');
    }

    return elt;
  }

  protected generateId(): number {
    return this.counter++;
  }

  protected setActiveNodeIndexes(): void {
    const nodesLength = this.nodes.length;

    this.activeNodeIndexes = [];

    for (let i = 0; i < nodesLength; i++) {
      const node = this.nodes[i];

      if (node.isMatching && !node.isHidden) {
        this.activeNodeIndexes.push(i);
      }
    }

    this.setVirtualTableHeight();
  }

  protected setTable(nodes: Node<T>[]): void {
    this.resetSortHandles();
    this.setNodes(nodes);
  }

  protected setNodes(nodes: Node<T>[]): void {
    this.nodes = nodes;

    this.setActiveNodeIndexes();

    this.updateVisibleNodes();
  }

  protected updateVisibleNodes(): void {
    const startIndex = this.computeFirstVisibleNodeIndex();
    this.displayVisibleNodes(startIndex);
    this.setVisibleNodeIndexes(startIndex);

    this.resetTableNodeElts();

    this.populateVisibleNodes();

    this.hideUnusedTableNodeElts();
    this.markSelectedNodes();
  }

  // ////////////////////////////////////////////////////////////////////////////

  private buildTable(): void {
    this.rootElt.appendChild(this.tableHeaderElt);
    this.rootElt.appendChild(this.tableBodyElt);
    this.tableHeaderElt.appendChild(this.tableHeaderRowElt);
    this.tableNodeElts.forEach((nodeElt) => {
      this.tableBodyElt.firstElementChild!.firstElementChild!.appendChild(nodeElt);
    });

    this.setTableBodyHeight();
  }

  private computeFirstVisibleNodeIndex(): number {
    const index =
      Math.floor(this.tableBodyElt.scrollTop / this.options.nodeHeight) - AbstractTable.VIRTUAL_SCROLL_PADDING;

    return Math.max(0, index);
  }

  private computeInitialColumnWidth(column: Column<T>): string {
    return column.width
      ? column.width.unit === '%'
        ? `${DomUtils.getEltComputedWidth(this.rootElt) * (column.width.value / 100)}px`
        : `${column.width.value}${column.width.unit}`
      : AbstractTable.INITIAL_COLUMN_WIDTH;
  }

  private createColumnView(column: Column<T>): ColumnView<T> {
    return { field: column.field, sortMode: column.sortMode };
  }

  private createTableBody(): HTMLElement {
    const elt = DomUtils.createDiv([AbstractTable.BODY_CLASS]);
    elt.appendChild(DomUtils.createDiv()).appendChild(DomUtils.createDiv());

    if (this.options.resizeFeature) {
      elt.classList.add('resizable');
    }

    return elt;
  }

  private createTableHeader(): HTMLElement {
    const elt = DomUtils.createDiv([AbstractTable.HEADER_CLASS]);

    if (this.options.resizeFeature) {
      elt.classList.add('resizable');
    }

    return elt;
  }

  private createTableHeaderCell(column: Column<T>): HTMLElement {
    const elt = DomUtils.createDiv([AbstractTable.CELL_CLASS]);
    elt.style.width = this.computeInitialColumnWidth(column);
    elt.appendChild(this.createTableHeaderCellContent(column));

    if (column.sortFeature) {
      elt.classList.add('sortable');
      elt.appendChild(DomUtils.createDiv([AbstractTable.SORT_ASC_HANDLE_CLASS]));
      elt.appendChild(DomUtils.createDiv([AbstractTable.SORT_DESC_HANDLE_CLASS]));
    }

    if (this.options.resizeFeature) {
      elt.appendChild(DomUtils.createDiv([AbstractTable.RESIZE_HANDLE_CLASS]));
    }

    return elt;
  }

  private createTableHeaderCellContent(column: Column<T>): HTMLElement {
    const elt = DomUtils.createDiv([AbstractTable.CELL_CONTENT_CLASS, column.align]);
    elt.textContent = column.title;

    return elt;
  }

  private createTableHeaderRow(): HTMLElement {
    const elt = DomUtils.createDiv([AbstractTable.ROW_CLASS]);

    this.columns.forEach((column) => {
      elt.appendChild(this.createTableHeaderCell(column));
    });

    return elt;
  }

  private createTableNode(): HTMLElement {
    const elt = DomUtils.createDiv([AbstractTable.ROW_CLASS]);
    elt.style.height = `${this.options.nodeHeight}px`;

    this.columns.forEach((column) => {
      elt.appendChild(this.createTableCell(column));
    });

    return elt;
  }

  private createTableNodes(): HTMLElement[] {
    return [...Array(this.virtualNodesCount).keys()].map(() => this.createTableNode());
  }

  private displayVisibleNodes(startIndex: number): void {
    const offsetY = startIndex * this.options.nodeHeight;
    (this.tableBodyElt.firstElementChild!
      .firstElementChild as HTMLElement).style.transform = `translateY(${offsetY}px)`;
  }

  private freezeFirstColumn(): void {
    const firstHeaderCellElt = this.tableHeaderRowElt.children[0] as HTMLElement;

    // Add 'frozen' class to first column cells
    firstHeaderCellElt.classList.add('frozen');

    this.tableNodeElts.forEach((nodeElt) => {
      (nodeElt.children[0] as HTMLElement).classList.add('frozen');
    });

    // Update offset of next column
    this.updateUnfrozenColumns(firstHeaderCellElt.style.width);
  }

  private getColumnSortHandles(headerCellElt: HTMLElement): { sortAscElt: HTMLElement; sortDescElt: HTMLElement } {
    const headerCellContentElts = headerCellElt.children;
    const sortAscElt = DomUtils.getEltByClassName(headerCellContentElts, AbstractTable.SORT_ASC_HANDLE_CLASS);
    const sortDescElt = DomUtils.getEltByClassName(headerCellContentElts, AbstractTable.SORT_DESC_HANDLE_CLASS);

    return { sortAscElt: sortAscElt as HTMLElement, sortDescElt: sortDescElt as HTMLElement };
  }

  private hideUnusedTableNodeElts(): void {
    const nodeEltsToHide = this.tableNodeElts.slice(this.visibleNodeIndexes.length);
    const nodeEltsToHideLength = nodeEltsToHide.length;

    for (let i = 0; i < nodeEltsToHideLength; i++) {
      nodeEltsToHide[i].classList.add('hidden');
    }
  }

  private markSelectedNodes(): void {
    const visibleNodesLength = this.visibleNodeIndexes.length;

    for (let i = 0; i < visibleNodesLength; i++) {
      if (this.nodes[this.visibleNodeIndexes[i]].isSelected) {
        this.tableNodeElts[i].classList.add('selected');
      }
    }
  }

  private populateCellContent(cellElt: HTMLElement, column: Column<T>, node: Node<T>): void {
    const cellContentElt = cellElt.lastElementChild as HTMLElement;
    const documentFragment = column.formatter(column.field, node.value);

    if (documentFragment.childElementCount > 0) {
      cellContentElt.innerHTML = '';
      cellContentElt.appendChild(documentFragment);
    } else {
      cellContentElt.textContent = documentFragment.textContent;
    }
  }

  private populateVisibleNodes(): void {
    const visibleNodesLength = this.visibleNodeIndexes.length;

    for (let i = 0; i < visibleNodesLength; i++) {
      const cellElts = this.tableNodeElts[i].children;
      const cellEltsLength = cellElts.length;

      for (let j = 0; j < cellEltsLength; j++) {
        this.populateCellContent(cellElts[j] as HTMLElement, this.columns[j], this.nodes[this.visibleNodeIndexes[i]]);
      }
    }
  }

  private resetSortHandles(): void {
    this.columns
      .filter((column) => column.sortFeature)
      .forEach((_, i) => {
        const headerCellElt = this.tableHeaderRowElt.children[i] as HTMLElement;
        const { sortAscElt, sortDescElt } = this.getColumnSortHandles(headerCellElt);
        sortAscElt.classList.remove('active');
        sortDescElt.classList.remove('active');
      });
  }

  private resetTableNodeElts(): void {
    const nodeEltsLength = this.tableNodeElts.length;

    for (let i = 0; i < nodeEltsLength; i++) {
      this.tableNodeElts[i].classList.remove('hidden', 'selected');
    }
  }

  private setColumnSortMode(targetColumn: Column<T>, sortMode: SortMode): void {
    const targetColumnIndex = this.columns.findIndex((column) => column.id === targetColumn.id);
    const headerCellElt = this.tableHeaderRowElt.children[targetColumnIndex] as HTMLElement;
    const { sortAscElt, sortDescElt } = this.getColumnSortHandles(headerCellElt);

    targetColumn.sortMode = sortMode;

    if (sortMode === 'asc') {
      sortAscElt.classList.add('active');
    } else if (sortMode === 'desc') {
      sortDescElt.classList.add('active');
    }
  }

  private setInitialColumnsWidth(): void {
    const headerCellElts = this.tableHeaderRowElt.children;
    const widths = Array.from(headerCellElts).map((node) => DomUtils.getEltComputedWidth(node as HTMLElement));
    const columnsCount = widths.filter((width) => width === 0).length;
    const columnsWidth = widths.reduce((acc, x) => acc + x, 0);
    const remainingWidth = DomUtils.getEltComputedWidth(this.rootElt) - columnsWidth;

    Array.from(headerCellElts).forEach((headerCellElt, i) => {
      if ((headerCellElt as HTMLElement).style.width === AbstractTable.INITIAL_COLUMN_WIDTH) {
        const formattedWidth = `${remainingWidth / columnsCount}px`;

        (headerCellElt as HTMLElement).style.width = formattedWidth;

        this.tableNodeElts.forEach((nodeElt) => {
          (nodeElt.children[i] as HTMLElement).style.width = formattedWidth;
        });
      }
    });
  }

  private setInitialTableWidth(): void {
    const width = Array.from(this.tableHeaderRowElt.children)
      .map((nodeElt) => DomUtils.getEltComputedWidth(nodeElt as HTMLElement))
      .reduce((acc, x) => acc + x, 0);
    this.updateTableWidth(`${width}px`);
  }

  private setTableBodyHeight(): void {
    this.tableBodyElt.style.height = `${this.options.visibleNodesCount * this.options.nodeHeight}px`;
  }

  private setVirtualTableHeight(): void {
    const height = this.activeNodeIndexes.length * this.options.nodeHeight;
    (this.tableBodyElt.firstElementChild as HTMLElement).style.minHeight = `${height}px`;
  }

  private setVisibleNodeIndexes(startIndex: number): void {
    this.visibleNodeIndexes = this.activeNodeIndexes.slice(startIndex, startIndex + this.virtualNodesCount);
  }

  private toggleNodesSelection(nodeIds: number[], isSelected: boolean): void {
    (nodeIds.length > 0
      ? (nodeIds.map((nodeId) => this.nodes.find((node) => node.id === nodeId)).filter((node) => !!node) as Node<T>[])
      : this.nodes
    ).forEach((node) => {
      node.isSelected = isSelected;
    });

    this.updateVisibleNodes();
  }

  private updateFrozenColumnPosition(): void {
    const formattedOffset = `${this.tableHeaderElt.scrollLeft}px`;
    const nodeEltsLength = this.tableNodeElts.length;

    (this.tableHeaderRowElt.children[0] as HTMLElement).style.left = formattedOffset;

    for (let i = 0; i < nodeEltsLength; i++) {
      (this.tableNodeElts[i].children[0] as HTMLElement).style.left = formattedOffset;
    }
  }

  private updateTableWidth(formattedWidth: string): void {
    (this.tableHeaderElt.firstElementChild as HTMLElement).style.width = formattedWidth;
    this.tableBodyElt.style.width = formattedWidth;
    (this.tableBodyElt.firstElementChild as HTMLElement).style.width = formattedWidth;
  }

  private updateUnfrozenColumns(formattedWidth: string): void {
    const nodeEltsLength = this.tableNodeElts.length;

    (this.tableHeaderRowElt.children[1] as HTMLElement).style.paddingLeft = formattedWidth;

    for (let i = 0; i < nodeEltsLength; i++) {
      (this.tableNodeElts[i].children[1] as HTMLElement).style.paddingLeft = formattedWidth;
    }
  }

  // ////////////////////////////////////////////////////////////////////////////

  private manageListenersOnResizeHandles(mode: EventListenerManageMode): void {
    if (this.options.resizeFeature) {
      const headerCellElts = this.tableHeaderRowElt.children;

      this.columns.forEach((column, i) => {
        const headerCellElt = headerCellElts[i];
        const resizeHandleElt = DomUtils.getEltByClassName(headerCellElt.children, AbstractTable.RESIZE_HANDLE_CLASS);

        DomUtils.manageEventListener(
          resizeHandleElt as HTMLElement,
          'mousedown',
          (event: MouseEvent) => {
            this.onResizeColumn(event, headerCellElt as HTMLElement, column);
          },
          mode
        );
      });
    }
  }

  private manageListenersOnSortHandles(mode: EventListenerManageMode): void {
    const headerCellElts = this.tableHeaderRowElt.children;

    this.columns
      .filter((column) => column.sortFeature)
      .forEach((column, i) => {
        const { sortAscElt, sortDescElt } = this.getColumnSortHandles(headerCellElts[i] as HTMLElement);

        DomUtils.manageEventListener(
          sortAscElt,
          'mouseup',
          (event) => {
            this.onSortColumn(event, column, 'asc');
          },
          mode
        );
        DomUtils.manageEventListener(
          sortDescElt,
          'mouseup',
          (event) => {
            this.onSortColumn(event, column, 'desc');
          },
          mode
        );
      });
  }

  private manageListenersOnTableBody(mode: EventListenerManageMode): void {
    DomUtils.manageEventListener(
      this.tableBodyElt,
      'scroll',
      () => {
        if (!this.isResizing) {
          this.onScrollTableBody();
        }
      },
      mode
    );
  }

  private manageListenersOnTableHeader(mode: EventListenerManageMode): void {
    Array.from(this.tableHeaderRowElt.children).forEach((cellElt, i) => {
      DomUtils.manageEventListener(
        cellElt as HTMLElement,
        'mouseup',
        (event) => {
          this.onClickTableHeaderCell(event, i);
        },
        mode
      );
    });
  }

  private manageListenersOnTableNodes(mode: EventListenerManageMode): void {
    this.tableNodeElts.forEach((nodeElt, i) => {
      DomUtils.manageEventListener(
        nodeElt,
        'mouseup',
        (event) => {
          this.onClickNode(event, i);
        },
        mode
      );
    });
  }

  private onClickNode(event: Event, nodeIndex: number): void {
    this.dispatchEventClickNode(event, this.nodes[this.visibleNodeIndexes[nodeIndex]]);
  }

  private onClickTableHeaderCell(event: Event, columnIndex: number): void {
    const eventElt = event.target as HTMLElement;

    if (
      !eventElt.classList.contains(AbstractTable.RESIZE_HANDLE_CLASS) &&
      !eventElt.classList.contains(AbstractTable.SORT_ASC_HANDLE_CLASS) &&
      !eventElt.classList.contains(AbstractTable.SORT_DESC_HANDLE_CLASS)
    ) {
      this.dispatchEventClickTableHeaderCell(event, this.columns[columnIndex]);
    }
  }

  private onResizeColumn(startEvent: MouseEvent, headerCellElt: HTMLElement, targetColumn: Column<T>): void {
    const columnIndex = this.columns.findIndex((column) => column.id === targetColumn.id);
    const isFirstColumn = targetColumn.id === this.columns[0].id;
    const originalColumnWidth = DomUtils.getEltComputedWidth(headerCellElt);
    const originalPageX = startEvent.pageX;
    const originalTableWidth = DomUtils.getEltComputedWidth(this.tableBodyElt.firstElementChild as HTMLElement);

    let eventPageX: number;
    let ticking = false;

    const requestTick = () => {
      if (!ticking) {
        requestAnimationFrame(updateColumnSize);
      }

      ticking = true;
    };
    const resize = (event: MouseEvent) => {
      eventPageX = event.pageX;

      requestTick();
    };
    const stopResize = (stopEvent: Event) => {
      stopEvent.stopPropagation();

      this.isResizing = false;

      window.removeEventListener('mouseup', stopResize, { capture: true });
      window.removeEventListener('mousemove', resize);
    };
    const updateColumnSize = () => {
      ticking = false;

      const columnWidth = Math.max(originalColumnWidth + (eventPageX - originalPageX), AbstractTable.COLUMN_MIN_WIDTH);
      const formattedColumnWidth = `${columnWidth}px`;
      const formattedTableWidth = `${originalTableWidth - originalColumnWidth + columnWidth}px`;
      const nodeEltsLength = this.tableNodeElts.length;

      // Table width
      this.updateTableWidth(formattedTableWidth);

      // Header cell width
      headerCellElt.style.width = formattedColumnWidth;

      // Body cells width
      for (let i = 0; i < nodeEltsLength; i++) {
        (this.tableNodeElts[i].children[columnIndex] as HTMLElement).style.width = formattedColumnWidth;
      }

      if (this.options.frozenFirstColumn) {
        this.updateFrozenColumnPosition();

        // If resizing the frozen column, update offset of next column
        if (isFirstColumn) {
          this.updateUnfrozenColumns(formattedColumnWidth);
        }
      }
    };

    this.isResizing = true;

    startEvent.preventDefault();

    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResize, { capture: true });
  }

  private onScrollTableBody(): void {
    // Horizontal scroll
    if (this.tableBodyElt.scrollLeft !== this.currentScrollX) {
      this.currentScrollX = this.tableBodyElt.scrollLeft;

      this.tableHeaderElt.scrollLeft = this.tableBodyElt.scrollLeft;

      if (this.options.frozenFirstColumn) {
        this.updateFrozenColumnPosition();
      }
    }

    // Vertical scroll
    if (this.tableBodyElt.scrollTop !== this.currentScrollY) {
      this.currentScrollY = this.tableBodyElt.scrollTop;

      this.updateVisibleNodes();
    }
  }

  private onSortColumn(event: Event, column: Column<T>, newSortMode: SortMode): void {
    this.dispatchEventSortColumn(event, column, newSortMode);
  }

  // ////////////////////////////////////////////////////////////////////////////

  private dispatchEventClickTableHeaderCell(originalEvent: Event, column: Column<T>): void {
    const columnView = this.createColumnView(column);
    const event = DomUtils.createEvent('onClickTableHeaderCell', { event: originalEvent, column: columnView });
    this.rootElt.dispatchEvent(event);
  }

  private dispatchEventSortColumn(originalEvent: Event, column: Column<T>, newSortMode: SortMode): void {
    const columnView = this.createColumnView(column);
    const event = DomUtils.createEvent('onSortColumn', { event: originalEvent, column: columnView, newSortMode });
    this.rootElt.dispatchEvent(event);
  }
}

// ////////////////////////////////////////////////////////////////////////////
// List Table
// ////////////////////////////////////////////////////////////////////////////

export class ListTable<T extends object> extends AbstractTable<T> {
  public constructor(
    rootElt: HTMLElement,
    options: { columnOptions: ColumnOptions<T>[]; tableOptions: ListTableOptions }
  ) {
    super(rootElt, options);
  }

  public setData(items: T[]): void {
    this.setTable(this.createNodes(items));
  }

  protected dispatchEventClickNode(originalEvent: Event, node: Node<T>): void {
    const event = DomUtils.createEvent('onClickNode', { event: originalEvent, node: this.createNodeView(node) });
    this.rootElt.dispatchEvent(event);
  }

  private createNodes(items: T[]): Node<T>[] {
    return items.map((item) => ({
      id: this.generateId(),
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
    return { id: node.id, value: node.value, isSelected: node.isSelected };
  }
}

// ////////////////////////////////////////////////////////////////////////////
// Tree Table
// ////////////////////////////////////////////////////////////////////////////

export class TreeTable<T extends object> extends AbstractTable<T> {
  private static readonly EXPAND_TOGGLER_CLASS: string = `${AbstractTable.VENDOR_PREFIX}-expand-toggler`;

  private readonly childNodeOffset: number;
  private readonly expandTogglerWidth: number;

  public constructor(
    rootElt: HTMLElement,
    options: { columnOptions: ColumnOptions<T>[]; tableOptions: TreeTableOptions }
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
