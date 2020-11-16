import { Column, ColumnView } from './column';
import { ColumnSortMode, ColumnWidthUnit } from './column-utils';
import { DomUtils, EventListenerManageMode } from './dom-utils';
import { ColumnOptions } from './column-options';
import { Node } from './node';
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
  private static readonly VIRTUAL_SCROLL_PADDING: number = 2;

  protected readonly rootElt: HTMLElement;
  protected tableBodyElt!: HTMLElement;
  protected tableHeaderElt!: HTMLElement;
  protected tableHeaderRowElt!: HTMLElement;
  protected tableNodeElts!: HTMLElement[];

  protected readonly options: TableOptions<T>;
  protected readonly virtualNodesCount: number;
  protected columns: Column<T>[];
  protected nodes: Node<T>[];
  protected visibleNodeIndexes: number[];

  private activeNodeIndexes: number[];
  private counter: number;
  private currentFilter: { matchFunc: (value: T) => boolean } | null;
  private currentSort: { column: Column<T>; mode: ColumnSortMode; compareFunc: (a: T, b: T) => number } | null;
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
    this.currentFilter = null;
    this.currentSort = null;
    this.currentScrollX = 0;
    this.currentScrollY = 0;
    this.isResizing = false;
    this.nodes = [];
    this.options = { ...tableOptions, frozenColumns: this.adjustFrozenColumns(tableOptions.frozenColumns) };
    this.virtualNodesCount = this.options.visibleNodesCount + AbstractTable.VIRTUAL_SCROLL_PADDING * 2;
    this.visibleNodeIndexes = [];

    this.rootElt = rootElt;
  }

  // ////////////////////////////////////////////////////////////////////////////

  public addColumn(
    columnOption: Omit<ColumnOptions<T>, 'width'> & { width: { value: number; unit: ColumnWidthUnit } },
    { position, refColumnId }: { position: 'start' | 'end'; refColumnId?: number }
  ): void {
    const isBebore = position === 'start';
    const refColumnIndex = refColumnId != null ? this.columns.findIndex((column) => column.id === refColumnId) : -1;
    const newColumnIndex =
      refColumnIndex !== -1 ? (isBebore ? refColumnIndex : refColumnIndex + 1) : isBebore ? 0 : this.columns.length;

    this.handleAddColumn(columnOption, newColumnIndex);
  }

  public deleteColumn(columnId: number): void {
    const columnIndex = this.columns.findIndex((column) => column.id === columnId);

    if (columnIndex !== -1) {
      this.handleDeleteColumn(columnIndex);
    }
  }

  public deleteNodes(nodeIds: number[]): void {
    this.nodes = this.nodes.filter((node) => !nodeIds.includes(node.id));

    this.updateNodes();
  }

  public deselectNodes(nodeIds: number[]): void {
    this.toggleNodesSelection(nodeIds, false);

    // Update nodes selection indicator in table header
    if (this.nodes.every((node) => !node.isSelected)) {
      this.tableHeaderRowElt.classList.remove('selected');
    }

    this.updateVisibleNodes();
  }

  public destroy(): void {
    this.removeListeners();
  }

  public filter(matchFunc: (value: T) => boolean): void {
    this.currentFilter = { matchFunc };

    this.updateNodes({ performFiltering: true });
  }

  public selectNodes(nodeIds: number[]): void {
    this.toggleNodesSelection(nodeIds, true);

    // Update nodes selection indicator in table header
    if (this.nodes.some((node) => node.isSelected)) {
      this.tableHeaderRowElt.classList.add('selected');
    }

    this.updateVisibleNodes();
  }

  public sort(columnId: number, mode: ColumnSortMode, compareFunc: (a: T, b: T) => number): void {
    const targetColumn = this.columns.find((column) => column.id === columnId);

    if (targetColumn?.sortFeature != null && targetColumn.sortFeature) {
      this.currentSort = { column: targetColumn, mode, compareFunc };

      this.updateNodes({ performSorting: true });
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

  protected createTableCell(column: Column<T>, _ctx: { nodeIndex: number }): HTMLElement {
    const elt = DomUtils.createDiv(AbstractTable.CELL_CLASS);
    elt.appendChild(DomUtils.createDiv(AbstractTable.CELL_CONTENT_CLASS, column.align));

    if (column.sortFeature) {
      elt.classList.add('sortable');
    }

    return elt;
  }

  protected generateId(): number {
    return this.counter++;
  }

  protected handleAddColumn(
    columnOption: Omit<ColumnOptions<T>, 'width'> & { width: { value: number; unit: ColumnWidthUnit } },
    newColumnIndex: number
  ): void {
    const isNewLastColumn = newColumnIndex === this.columns.length;
    const newColumnId = Math.max(...this.columns.map((column) => column.id)) + 1;
    const newColumn: Column<T> = { ...columnOption, id: newColumnId, sortMode: 'default' };
    const newColumnWidth = this.convertInPixel(columnOption.width);

    const insertNewElt = (elt: HTMLElement, parentElt: HTMLElement): void => {
      if (isNewLastColumn) {
        parentElt.appendChild(elt);
      } else {
        parentElt.insertBefore(elt, parentElt.children[newColumnIndex]);
      }

      elt.style.width = `${newColumnWidth}px`;
    };

    const unfreeze = (elt: HTMLElement): void => {
      for (let i = 0; i < this.options.frozenColumns; i++) {
        elt.children[i].classList.remove('frozen');
        (elt.children[i] as HTMLElement).style.left = '';
      }
    };

    //
    this.columns.splice(newColumnIndex, 0, newColumn);

    // Clear frozen context
    if (this.options.frozenColumns && newColumnIndex <= this.options.frozenColumns) {
      this.updateFirstUnfrozenColumnOffset('');

      if (newColumnIndex < this.options.frozenColumns) {
        unfreeze(this.tableHeaderRowElt);
        this.tableNodeElts.forEach((nodeElt) => {
          unfreeze(nodeElt);
        });
      }
    }

    // Add new elements
    insertNewElt(this.createTableHeaderCell(newColumn, { columnIndex: newColumnIndex }), this.tableHeaderRowElt);
    this.tableNodeElts.forEach((nodeElt, i) => {
      insertNewElt(this.createTableCell(newColumn, { nodeIndex: i }), nodeElt);
    });

    // Update frozen context
    if (this.options.frozenColumns && newColumnIndex <= this.options.frozenColumns) {
      if (newColumnIndex < this.options.frozenColumns) {
        this.freezeColumns();
      } else {
        this.updateFirstUnfrozenColumnOffset();
      }
    }

    //
    this.updateTableWidth(`${DomUtils.getEltWidth(this.tableBodyElt) + newColumnWidth}px`);
    this.updateVisibleNodes();
  }

  protected handleDeleteColumn(columnIndex: number): void {
    const columnWidth = DomUtils.getEltWidth(this.tableHeaderRowElt.children[columnIndex] as HTMLElement);

    //
    this.columns = this.columns.filter((_, i) => i !== columnIndex);

    // Clear frozen context
    if (this.options.frozenColumns && columnIndex < this.options.frozenColumns) {
      this.updateFirstUnfrozenColumnOffset('');
    }

    // Adjust 'frozenColumns' option if there are no longer enough columns
    this.options.frozenColumns = this.adjustFrozenColumns(this.options.frozenColumns);

    // Remove elements
    const cellElt = this.tableHeaderRowElt.childNodes[columnIndex];
    this.removeListenersOnTableHeaderCell(cellElt as HTMLElement, columnIndex);
    cellElt.remove();

    this.tableNodeElts.forEach((tableNodeElt) => {
      tableNodeElt.childNodes[columnIndex].remove();
    });

    // Update frozen context
    if (this.options.frozenColumns && columnIndex <= this.options.frozenColumns) {
      if (columnIndex < this.options.frozenColumns) {
        this.freezeColumns();
      } else {
        this.updateFirstUnfrozenColumnOffset();
      }
    }

    //
    this.updateTableWidth(`${DomUtils.getEltWidth(this.tableBodyElt) - columnWidth}px`);
    this.updateVisibleNodes();
  }

  protected init(): void {
    this.tableBodyElt = this.createTableBody();
    this.tableHeaderElt = this.createTableHeader();
    this.tableHeaderRowElt = this.createTableHeaderRow();
    this.tableNodeElts = this.createTableNodes();

    this.buildTable();

    this.hideUnusedTableNodeElts();

    this.setInitialWidths();

    if (this.options.frozenColumns) {
      this.freezeColumns();
    }
  }

  protected setActiveNodeIndexes(): void {
    this.activeNodeIndexes = [];

    for (let i = 0, len = this.nodes.length; i < len; i++) {
      const node = this.nodes[i];

      if (node.isMatching && !node.isHidden) {
        this.activeNodeIndexes.push(i);
      }
    }

    this.setVirtualTableHeight();
  }

  protected setNodes(nodes: Node<T>[]): void {
    this.currentFilter = null;
    this.currentSort = null;
    this.nodes = nodes;

    this.resetColumnSortHandles();

    this.updateNodes();
  }

  protected updateNodes(options?: { performFiltering?: boolean; performSorting?: boolean }): void {
    if (options?.performFiltering != null && options.performFiltering && this.currentFilter) {
      this.handleFilter(this.currentFilter.matchFunc);
    }
    if (options?.performSorting != null && options.performSorting && this.currentSort) {
      this.nodes = this.handleSort(this.currentSort.column, this.currentSort.mode, this.currentSort.compareFunc);
    }

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

  private adjustFrozenColumns(frozenColumns: number): number {
    return frozenColumns < this.columns.length ? frozenColumns : 0;
  }

  private buildTable(): void {
    this.rootElt.appendChild(this.tableHeaderElt);
    this.rootElt.appendChild(this.tableBodyElt);
    this.tableHeaderElt.appendChild(this.tableHeaderRowElt);
    this.tableNodeElts.forEach((nodeElt) => {
      ((this.tableBodyElt.firstElementChild as HTMLElement).firstElementChild as HTMLElement).appendChild(nodeElt);
    });

    this.setTableBodyHeight();
  }

  private computeFirstVisibleNodeIndex(): number {
    const index =
      Math.floor(this.tableBodyElt.scrollTop / this.options.nodeHeight) - AbstractTable.VIRTUAL_SCROLL_PADDING;

    return Math.max(0, index);
  }

  private convertInPixel({ value, unit }: { value: number; unit: ColumnWidthUnit }): number {
    switch (unit) {
      case '%':
        return DomUtils.getEltComputedWidth(this.rootElt) * (value / 100);

      default:
        return value;
    }
  }

  private createColumnView(column: Column<T>): ColumnView<T> {
    return { id: column.id, sortMode: column.sortMode };
  }

  private createTableBody(): HTMLElement {
    const elt = DomUtils.createDiv(AbstractTable.BODY_CLASS);
    elt.appendChild(DomUtils.createDiv()).appendChild(DomUtils.createDiv());

    if (this.columns.some((column) => column.resizeFeature)) {
      elt.classList.add('resizable');
    }

    this.manageListenersOnTableBody(EventListenerManageMode.ADD, elt);

    return elt;
  }

  private createTableHeader(): HTMLElement {
    const elt = DomUtils.createDiv(AbstractTable.HEADER_CLASS);

    if (this.columns.some((column) => column.resizeFeature)) {
      elt.classList.add('resizable');
    }

    return elt;
  }

  private createTableHeaderCell(column: Column<T>, ctx: { columnIndex: number }): HTMLElement {
    const elt = DomUtils.createDiv(AbstractTable.CELL_CLASS);
    elt.appendChild(this.createTableHeaderCellContent(column));

    this.manageListenersOnTableHeaderCell(EventListenerManageMode.ADD, elt, ctx.columnIndex);

    if (column.sortFeature) {
      const sortAscElt = DomUtils.createDiv(AbstractTable.SORT_ASC_HANDLE_CLASS);
      const sortDescElt = DomUtils.createDiv(AbstractTable.SORT_DESC_HANDLE_CLASS);
      elt.classList.add('sortable');
      elt.appendChild(sortAscElt);
      elt.appendChild(sortDescElt);

      this.manageListenersOnSortHandles(EventListenerManageMode.ADD, sortAscElt, sortDescElt, ctx.columnIndex);
    }

    if (column.resizeFeature) {
      const resizeHandleElt = DomUtils.createDiv(AbstractTable.RESIZE_HANDLE_CLASS);
      elt.appendChild(resizeHandleElt);

      this.manageListenersOnResizeHandle(EventListenerManageMode.ADD, resizeHandleElt, ctx.columnIndex);
    }

    return elt;
  }

  private createTableHeaderCellContent(column: Column<T>): HTMLElement {
    const elt = DomUtils.createDiv(AbstractTable.CELL_CONTENT_CLASS, column.align);
    elt.textContent = column.title;

    return elt;
  }

  private createTableHeaderRow(): HTMLElement {
    const elt = DomUtils.createDiv(AbstractTable.ROW_CLASS);

    this.columns.forEach((column, i) => {
      elt.appendChild(this.createTableHeaderCell(column, { columnIndex: i }));
    });

    return elt;
  }

  private createTableNode(ctx: { nodeIndex: number }): HTMLElement {
    const elt = DomUtils.createDiv(AbstractTable.ROW_CLASS);
    elt.style.height = `${this.options.nodeHeight}px`;

    this.manageListenersOnTableNode(EventListenerManageMode.ADD, elt, ctx.nodeIndex);

    this.columns.forEach((column) => {
      elt.appendChild(this.createTableCell(column, ctx));
    });

    return elt;
  }

  private createTableNodes(): HTMLElement[] {
    return [...Array(this.virtualNodesCount).keys()].map((_, i) => this.createTableNode({ nodeIndex: i }));
  }

  private displayVisibleNodes(startIndex: number): void {
    const offsetY = startIndex * this.options.nodeHeight;
    ((this.tableBodyElt.firstElementChild as HTMLElement)
      .firstElementChild as HTMLElement).style.transform = `translateY(${offsetY}px)`;
  }

  private freezeColumns(): void {
    const freezeCell = (elt: HTMLElement, offset: number): void => {
      elt.classList.add('frozen');
      elt.style.left = `${offset}px`;
    };

    for (let i = 0; i < this.options.frozenColumns; i++) {
      let offset = 0;
      for (let j = 0; j < i; j++) {
        offset += DomUtils.getEltWidth(this.tableHeaderRowElt.children[j] as HTMLElement);
      }

      freezeCell(this.tableHeaderRowElt.children[i] as HTMLElement, offset);

      this.tableNodeElts.forEach((nodeElt) => {
        freezeCell(nodeElt.children[i] as HTMLElement, offset);
      });
    }

    this.updateFirstUnfrozenColumnOffset();
  }

  private getColumnSortHandles(headerCellElt: HTMLElement): { sortAscElt: HTMLElement; sortDescElt: HTMLElement } {
    const headerCellContentElts = headerCellElt.children;
    const sortAscElt = DomUtils.getEltByClassName(headerCellContentElts, AbstractTable.SORT_ASC_HANDLE_CLASS);
    const sortDescElt = DomUtils.getEltByClassName(headerCellContentElts, AbstractTable.SORT_DESC_HANDLE_CLASS);

    return { sortAscElt: sortAscElt as HTMLElement, sortDescElt: sortDescElt as HTMLElement };
  }

  private handleFilter(matchFunc: (value: T) => boolean): void {
    const nodesLength = this.nodes.length;

    for (let i = nodesLength - 1; i >= 0; i--) {
      const node = this.nodes[i];
      node.isMatching = matchFunc(node.value);

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
  }

  private handleSort(column: Column<T>, mode: ColumnSortMode, compareFunc: (a: T, b: T) => number): Node<T>[] {
    const compareWithOrderFunc = (a: T, b: T): number => compareFunc(a, b) * (mode === 'desc' ? -1 : 1);
    const nodesLength = this.nodes.length;
    const rootNodes = [];
    const sortedChildrenByParentNodeId = new Map<number, Node<T>[]>();

    this.resetColumnSortHandles();

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
        children.sort((a, b) => compareWithOrderFunc(a.value, b.value) * -1)
      );

      if (node.level === 0) {
        rootNodes.push(node);
      }
    }

    const sortedNodes = [];
    const stack = rootNodes.sort((a, b) => compareWithOrderFunc(a.value, b.value) * -1);

    while (stack.length > 0) {
      const node = stack.pop() as Node<T>;

      sortedNodes.push(node);
      Array.prototype.push.apply(stack, sortedChildrenByParentNodeId.get(node.id) as Node<T>[]);
    }

    this.setColumnSortMode(column, mode);

    return sortedNodes;
  }

  private hideUnusedTableNodeElts(): void {
    for (let i = this.visibleNodeIndexes.length, len = this.tableNodeElts.length; i < len; i++) {
      this.tableNodeElts[i].classList.add('hidden');
    }
  }

  private populateCellContent(cellElt: HTMLElement, column: Column<T>, node: Node<T>): void {
    const cellContentElt = cellElt.lastElementChild as HTMLElement;
    const [fragment, ...cleanupFuncs] = column.formatter(node.value);

    for (let i = 0, len = cleanupFuncs.length; i < len; i++) {
      cleanupFuncs[i]();
    }

    if (fragment.childElementCount > 0) {
      cellContentElt.innerHTML = '';
      cellContentElt.appendChild(fragment);
    } else {
      cellContentElt.textContent = fragment.textContent;
    }
  }

  private populateVisibleNodes(): void {
    const columnsLength = this.columns.length;
    const defaultCellColor = { backgroundColor: '', color: '' };

    for (let i = 0, len = this.visibleNodeIndexes.length; i < len; i++) {
      const node = this.nodes[this.visibleNodeIndexes[i]];
      const nodeElt = this.tableNodeElts[i];
      const rowColor = this.options.rowColor?.(node.value);

      for (let j = 0; j < columnsLength; j++) {
        const cellElt = nodeElt.children[j] as HTMLElement;
        const column = this.columns[j];

        this.populateCellContent(cellElt, column, node);

        // Update cell color
        const cellColor = this.options.cellColor?.(node.value, column.id) ?? rowColor ?? defaultCellColor;
        cellElt.style.backgroundColor = cellColor.backgroundColor ?? cellElt.style.backgroundColor;
        cellElt.style.color = cellColor.color ?? cellElt.style.color;
      }

      // Mark selection
      if (node.isSelected) {
        nodeElt.classList.add('selected');
      }
    }
  }

  private resetColumnSortHandles(): void {
    for (let i = 0, len = this.columns.length; i < len; i++) {
      if (this.columns[i].sortFeature) {
        const headerCellElt = this.tableHeaderRowElt.children[i] as HTMLElement;
        const { sortAscElt, sortDescElt } = this.getColumnSortHandles(headerCellElt);
        sortAscElt.classList.remove('active');
        sortDescElt.classList.remove('active');
      }
    }
  }

  private resetTableNodeElts(): void {
    for (let i = 0, len = this.tableNodeElts.length; i < len; i++) {
      this.tableNodeElts[i].classList.remove('hidden', 'selected');
    }
  }

  private setColumnSortMode(targetColumn: Column<T>, sortMode: ColumnSortMode): void {
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

  private setInitialWidths(): void {
    let columnsWidth = 0;

    // Set widths from columns definition
    this.columns.forEach((column, i) => {
      if (column.width != null) {
        const columnWidth = this.convertInPixel(column.width);
        const formattedColumnWidth = `${columnWidth}px`;

        (this.tableHeaderRowElt.children[i] as HTMLElement).style.width = formattedColumnWidth;
        this.updateTableBodyColumnWidth(i, formattedColumnWidth);

        columnsWidth += columnWidth;
      }
    });

    // Distribute available width to other columns
    const rootEltWidth = DomUtils.getEltComputedWidth(this.rootElt);
    const availableWidth = rootEltWidth - columnsWidth;

    if (availableWidth > 0) {
      const columnWidth = availableWidth / this.columns.filter((column) => !column.width).length;
      const formattedColumnWidth = `${columnWidth}px`;

      for (let i = 0, len = this.columns.length; i < len; i++) {
        const elt = this.tableHeaderRowElt.children[i] as HTMLElement;

        if (!elt.style.width) {
          elt.style.width = formattedColumnWidth;

          this.tableNodeElts.forEach((nodeElt) => {
            (nodeElt.children[i] as HTMLElement).style.width = formattedColumnWidth;
          });

          columnsWidth += columnWidth;
        }
      }
    }

    //
    this.updateTableWidth(`${columnsWidth}px`);
  }

  private setTableBodyHeight(): void {
    this.tableBodyElt.style.maxHeight = `${this.options.visibleNodesCount * this.options.nodeHeight}px`;
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
      ? (nodeIds.map((nodeId) => this.nodes.find((node) => node.id === nodeId)).filter((node) => node) as Node<T>[])
      : this.nodes
    ).forEach((node) => {
      node.isSelected = isSelected;
    });
  }

  private updateFirstUnfrozenColumnOffset(offset?: string): void {
    let formattedWidth;
    if (offset != null) {
      formattedWidth = offset;
    } else {
      let frozenColumnsWidth = 0;
      for (let i = 0; i < this.options.frozenColumns; i++) {
        frozenColumnsWidth += DomUtils.getEltWidth(this.tableHeaderRowElt.children[i] as HTMLElement);
      }
      formattedWidth = `${frozenColumnsWidth}px`;
    }

    (this.tableHeaderRowElt.children[this.options.frozenColumns] as HTMLElement).style.paddingLeft = formattedWidth;

    for (let i = 0, len = this.tableNodeElts.length; i < len; i++) {
      (this.tableNodeElts[i].children[this.options.frozenColumns] as HTMLElement).style.paddingLeft = formattedWidth;
    }
  }

  private updateFrozenColumnPosition(): void {
    for (let i = 0; i < this.options.frozenColumns; i++) {
      let offset = 0;
      for (let j = 0; j < i; j++) {
        offset += DomUtils.getEltWidth(this.tableHeaderRowElt.children[j] as HTMLElement);
      }

      const formattedOffset = `${this.tableHeaderElt.scrollLeft + offset}px`;

      (this.tableHeaderRowElt.children[i] as HTMLElement).style.left = formattedOffset;

      for (let j = 0, len = this.tableNodeElts.length; j < len; j++) {
        (this.tableNodeElts[j].children[i] as HTMLElement).style.left = formattedOffset;
      }
    }
  }

  private updateTableBodyColumnWidth(columnIndex: number, width: string): void {
    for (let i = 0, len = this.tableNodeElts.length; i < len; i++) {
      (this.tableNodeElts[i].children[columnIndex] as HTMLElement).style.width = width;
    }
  }

  private updateTableWidth(formattedWidth: string): void {
    (this.tableHeaderElt.firstElementChild as HTMLElement).style.width = formattedWidth;
    this.tableBodyElt.style.width = formattedWidth;
    (this.tableBodyElt.firstElementChild as HTMLElement).style.width = formattedWidth;
  }

  // ////////////////////////////////////////////////////////////////////////////

  private manageListenersOnResizeHandle(mode: EventListenerManageMode, elt: HTMLElement, columnIndex: number): void {
    if (this.columns[columnIndex].resizeFeature) {
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
    const headerCellElt = this.tableHeaderRowElt.children[columnIndex] as HTMLElement;
    const isFrozenColumn = columnIndex < this.options.frozenColumns;
    const originalColumnWidth = DomUtils.getEltComputedWidth(headerCellElt);
    const originalPageX = startEvent.pageX;
    const originalTableWidth = DomUtils.getEltComputedWidth(this.tableBodyElt.firstElementChild as HTMLElement);

    let eventPageX: number;
    let isTicking = false;

    const updateColumnSize = (): void => {
      isTicking = false;

      const columnWidth = Math.max(originalColumnWidth + (eventPageX - originalPageX), AbstractTable.COLUMN_MIN_WIDTH);
      const formattedColumnWidth = `${columnWidth}px`;
      const formattedTableWidth = `${originalTableWidth - originalColumnWidth + columnWidth}px`;

      // Table width
      this.updateTableWidth(formattedTableWidth);

      // Header cell width
      headerCellElt.style.width = formattedColumnWidth;

      // Body cells width
      this.updateTableBodyColumnWidth(columnIndex, formattedColumnWidth);

      if (this.options.frozenColumns) {
        this.updateFrozenColumnPosition();

        if (isFrozenColumn) {
          this.updateFirstUnfrozenColumnOffset();
        }
      }
    };
    const requestTick = (): void => {
      if (!isTicking) {
        requestAnimationFrame(updateColumnSize);
      }

      isTicking = true;
    };
    const resize = (event: MouseEvent): void => {
      eventPageX = event.pageX;

      requestTick();
    };
    const stopResize = (stopEvent: Event): void => {
      stopEvent.stopPropagation();

      this.isResizing = false;

      window.removeEventListener('mouseup', stopResize, { capture: true });
      window.removeEventListener('mousemove', resize);
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

      if (this.options.frozenColumns) {
        this.updateFrozenColumnPosition();
      }
    }

    // Vertical scroll
    if (this.tableBodyElt.scrollTop !== this.currentScrollY) {
      this.currentScrollY = this.tableBodyElt.scrollTop;

      this.updateVisibleNodes();
    }
  }

  private onSortColumn(event: Event, columnIndex: number, newSortMode: ColumnSortMode): void {
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
    if (this.columns[columnIndex].resizeFeature) {
      const resizeHandleElt = DomUtils.getEltByClassName(elt.children, AbstractTable.RESIZE_HANDLE_CLASS);
      this.manageListenersOnResizeHandle(EventListenerManageMode.REMOVE, resizeHandleElt as HTMLElement, columnIndex);
    }

    // Others
    this.manageListenersOnTableHeaderCell(EventListenerManageMode.REMOVE, elt, columnIndex);
  }

  private removeListenersOnTableHeaderCells(): void {
    for (let i = 0, len = this.columns.length; i < len; i++) {
      this.removeListenersOnTableHeaderCell(this.tableHeaderRowElt.children[i] as HTMLElement, i);
    }
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

  private dispatchEventSortColumn(originalEvent: Event, column: Column<T>, newSortMode: ColumnSortMode): void {
    const columnView = this.createColumnView(column);
    const event = DomUtils.createEvent('onSortColumn', { event: originalEvent, column: columnView, newSortMode });
    this.rootElt.dispatchEvent(event);
  }
}
