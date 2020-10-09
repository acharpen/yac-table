import { Column, ColumnView } from './column';
import { ColumnOptions } from './column-options';
import { DomUtils, EventListenerManageMode } from './dom-utils';
import { Node } from './node';
import { SortMode } from './sort-utils';
import { WidthUnit } from './styles-utils';
import { TableOptions } from './table-options';

export abstract class AbstractTable<T> {
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

  protected readonly options: TableOptions<T>;
  protected readonly virtualNodesCount: number;
  protected columns: Column<T>[];
  protected nodes: Node<T>[];
  protected visibleNodeIndexes: number[];

  private activeNodeIndexes: number[];
  private counter: number;
  private currentScrollX: number;
  private currentScrollY: number;
  private isResizing: boolean;

  protected constructor(
    rootElt: HTMLElement,
    { columnOptions, tableOptions }: { columnOptions: ColumnOptions<T>[]; tableOptions: TableOptions<T> }
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

    this.hideUnusedTableNodeElts();

    this.setInitialColumnsWidth();

    this.setInitialTableWidth();

    if (this.options.frozenFirstColumn) {
      this.freezeFirstColumn();
    }
  }

  // ////////////////////////////////////////////////////////////////////////////

  public addColumn(
    columnOption: Omit<ColumnOptions<T>, 'width'> & { width: { value: number; unit: WidthUnit } },
    position: 'start' | 'end',
    columnField?: keyof T
  ): void {
    const atStart = position === 'start';
    const columnIndex = !!columnField ? this.columns.findIndex((column) => column.field === columnField) : -1;
    const newColumnId = this.columns.map((column) => column.id).reduce((acc, x) => (x > acc ? x : acc), 0) + 1;
    const newColumnIndex =
      columnIndex !== -1 ? (atStart ? columnIndex : columnIndex + 1) : atStart ? 0 : this.columns.length;
    const newColumn: Column<T> = { ...columnOption, id: newColumnId, sortMode: 'default' };
    const isNewLastColumn = newColumnIndex === this.columns.length;

    const insertNewElt = (newElt: HTMLElement, parentElt: HTMLElement) => {
      if (isNewLastColumn) {
        parentElt.appendChild(newElt);
      } else {
        parentElt.insertBefore(newElt, parentElt.childNodes.item(newColumnIndex + 1));
      }
    };

    this.columns.splice(newColumnIndex, 0, newColumn);

    this.options.frozenFirstColumn = this.options.frozenFirstColumn && this.columns.length > 1;

    if (this.options.frozenFirstColumn && newColumnIndex === 0) {
      this.unfreezeFirstColumn();
    }

    const newCellElt = this.createTableHeaderCell(newColumn, newColumnIndex);
    insertNewElt(newCellElt, this.tableHeaderRowElt);

    this.tableNodeElts.forEach((tableNodeElt, i) => {
      insertNewElt(this.createTableCell(newColumn, i), tableNodeElt);
    });

    if (this.options.frozenFirstColumn && newColumnIndex === 0) {
      this.freezeFirstColumn();
    }

    this.updateVisibleNodes();
  }

  public deleteColumn(columnField: keyof T): void {
    const columnIndex = this.columns.findIndex((column) => column.field === columnField);

    if (columnIndex !== -1) {
      this.columns = this.columns.filter((column) => column.field !== columnField);

      this.options.frozenFirstColumn = this.options.frozenFirstColumn && this.columns.length > 1;

      const cellElt = this.tableHeaderRowElt.childNodes.item(columnIndex);
      this.removeListenersOnTableHeaderCell(cellElt as HTMLElement, columnIndex);
      this.tableHeaderRowElt.removeChild(cellElt);

      this.tableNodeElts.forEach((tableNodeElt) => {
        tableNodeElt.removeChild(tableNodeElt.childNodes.item(columnIndex));
      });

      if (this.options.frozenFirstColumn && columnIndex === 0) {
        this.freezeFirstColumn();
      }

      this.updateVisibleNodes();
    }
  }

  public deselectNodes(nodeIds: number[]): void {
    this.toggleNodesSelection(nodeIds, false);
  }

  public destroy(): void {
    this.removeListeners();
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
    this.setVirtualTableHeight();
  }

  // ////////////////////////////////////////////////////////////////////////////

  protected abstract dispatchEventClickNode(originalEvent: Event, node: Node<T>): void;

  // ////////////////////////////////////////////////////////////////////////////

  protected createTableCell(column: Column<T>, _nodeIndex: number): HTMLElement {
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

    this.manageListenersOnTableBody(EventListenerManageMode.ADD, elt);

    return elt;
  }

  private createTableHeader(): HTMLElement {
    const elt = DomUtils.createDiv([AbstractTable.HEADER_CLASS]);

    if (this.options.resizeFeature) {
      elt.classList.add('resizable');
    }

    return elt;
  }

  private createTableHeaderCell(column: Column<T>, columnIndex: number): HTMLElement {
    const elt = DomUtils.createDiv([AbstractTable.CELL_CLASS]);
    elt.style.width = this.computeInitialColumnWidth(column);
    elt.appendChild(this.createTableHeaderCellContent(column));

    this.manageListenersOnTableHeaderCell(EventListenerManageMode.ADD, elt, columnIndex);

    if (column.sortFeature) {
      const sortAscElt = DomUtils.createDiv([AbstractTable.SORT_ASC_HANDLE_CLASS]);
      const sortDescElt = DomUtils.createDiv([AbstractTable.SORT_DESC_HANDLE_CLASS]);
      elt.classList.add('sortable');
      elt.appendChild(sortAscElt);
      elt.appendChild(sortDescElt);

      this.manageListenersOnSortHandles(EventListenerManageMode.ADD, sortAscElt, sortDescElt, columnIndex);
    }

    if (this.options.resizeFeature) {
      const resizeHandleElt = DomUtils.createDiv([AbstractTable.RESIZE_HANDLE_CLASS]);
      elt.appendChild(resizeHandleElt);

      this.manageListenersOnResizeHandle(EventListenerManageMode.ADD, resizeHandleElt, columnIndex);
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

    this.columns.forEach((column, i) => {
      elt.appendChild(this.createTableHeaderCell(column, i));
    });

    return elt;
  }

  private createTableNode(nodeIndex: number): HTMLElement {
    const elt = DomUtils.createDiv([AbstractTable.ROW_CLASS]);
    elt.style.height = `${this.options.nodeHeight}px`;

    this.manageListenersOnTableNode(EventListenerManageMode.ADD, elt, nodeIndex);

    this.columns.forEach((column) => {
      elt.appendChild(this.createTableCell(column, nodeIndex));
    });

    return elt;
  }

  private createTableNodes(): HTMLElement[] {
    return [...Array(this.virtualNodesCount).keys()].map((_, i) => this.createTableNode(i));
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
    const nodeEltsLength = this.tableNodeElts.length;

    for (let i = this.visibleNodeIndexes.length; i < nodeEltsLength; i++) {
      this.tableNodeElts[i].classList.add('hidden');
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
    const columnsLength = this.columns.length;
    const defaultCellColor = { backgroundColor: '', color: '' };
    const visibleNodesLength = this.visibleNodeIndexes.length;

    for (let i = 0; i < visibleNodesLength; i++) {
      const node = this.nodes[this.visibleNodeIndexes[i]];
      const nodeElt = this.tableNodeElts[i];
      const rowColor = this.options.rowColor?.(node.value);

      for (let j = 0; j < columnsLength; j++) {
        const cellElt = nodeElt.children[j] as HTMLElement;
        const column = this.columns[j];

        this.populateCellContent(cellElt, column, node);

        // Update cell color
        const cellColor = this.options.cellColor?.(node.value, column) ?? rowColor ?? defaultCellColor;
        cellElt.style.backgroundColor = cellColor.backgroundColor ?? cellElt.style.backgroundColor;
        cellElt.style.color = cellColor.color ?? cellElt.style.color;
      }

      // Mark selection
      if (node.isSelected) {
        nodeElt.classList.add('selected');
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

  private unfreezeFirstColumn(): void {
    const firstHeaderCellElt = this.tableHeaderRowElt.children[0] as HTMLElement;

    // Remove 'frozen' class to first column cells
    firstHeaderCellElt.classList.remove('frozen');

    this.tableNodeElts.forEach((nodeElt) => {
      (nodeElt.children[0] as HTMLElement).classList.remove('frozen');
    });

    // Update offset of next column
    this.updateUnfrozenColumns('');
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

  private manageListenersOnResizeHandle(mode: EventListenerManageMode, elt: HTMLElement, columnIndex: number): void {
    if (this.options.resizeFeature) {
      DomUtils.manageEventListener(
        elt,
        'mousedown',
        (event: MouseEvent) => {
          this.onResizeColumn(event, columnIndex);
        },
        mode
      );
    }
  }

  private manageListenersOnSortHandles(
    mode: EventListenerManageMode,
    sortAscElt: HTMLElement,
    sortDescElt: HTMLElement,
    columnIndex: number
  ): void {
    DomUtils.manageEventListener(
      sortAscElt,
      'mouseup',
      (event) => {
        this.onSortColumn(event, columnIndex, 'asc');
      },
      mode
    );
    DomUtils.manageEventListener(
      sortDescElt,
      'mouseup',
      (event) => {
        this.onSortColumn(event, columnIndex, 'desc');
      },
      mode
    );
  }

  private manageListenersOnTableBody(mode: EventListenerManageMode, elt: HTMLElement): void {
    DomUtils.manageEventListener(
      elt,
      'scroll',
      () => {
        if (!this.isResizing) {
          this.onScrollTableBody();
        }
      },
      mode
    );
  }

  private manageListenersOnTableHeaderCell(mode: EventListenerManageMode, elt: HTMLElement, columnIndex: number): void {
    DomUtils.manageEventListener(
      elt,
      'mouseup',
      (event) => {
        this.onClickTableHeaderCell(event, columnIndex);
      },
      mode
    );
  }

  private manageListenersOnTableNode(mode: EventListenerManageMode, elt: HTMLElement, nodeIndex: number): void {
    DomUtils.manageEventListener(
      elt,
      'mouseup',
      (event) => {
        this.onClickNode(event, nodeIndex);
      },
      mode
    );
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

  private onResizeColumn(startEvent: MouseEvent, columnIndex: number): void {
    const headerCellElt = this.tableHeaderRowElt.children.item(columnIndex) as HTMLElement;
    const isFirstColumn = columnIndex === 0;
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

  private onSortColumn(event: Event, columnIndex: number, newSortMode: SortMode): void {
    this.dispatchEventSortColumn(event, this.columns[columnIndex], newSortMode);
  }

  private removeListeners(): void {
    this.removeListenersOnTableNodes();
    this.manageListenersOnTableBody(EventListenerManageMode.REMOVE, this.tableBodyElt);
    this.removeListenersOnTableHeaderCells();
  }

  private removeListenersOnTableHeaderCell(elt: HTMLElement, columnIndex: number): void {
    // Sort handles
    const { sortAscElt, sortDescElt } = this.getColumnSortHandles(elt);
    this.manageListenersOnSortHandles(EventListenerManageMode.REMOVE, sortAscElt, sortDescElt, columnIndex);

    // Resize handle
    if (this.options.resizeFeature) {
      const resizeHandleElt = DomUtils.getEltByClassName(elt.children, AbstractTable.RESIZE_HANDLE_CLASS);
      this.manageListenersOnResizeHandle(EventListenerManageMode.REMOVE, resizeHandleElt as HTMLElement, columnIndex);
    }

    // Others
    this.manageListenersOnTableHeaderCell(EventListenerManageMode.REMOVE, elt, columnIndex);
  }

  private removeListenersOnTableHeaderCells(): void {
    Array.from(this.tableHeaderRowElt.children).forEach((cellElt, i) => {
      this.removeListenersOnTableHeaderCell(cellElt as HTMLElement, i);
    });
  }

  private removeListenersOnTableNodes(): void {
    this.tableNodeElts.forEach((nodeElt, i) => {
      this.manageListenersOnTableNode(EventListenerManageMode.REMOVE, nodeElt, i);
    });
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
