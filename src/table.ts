import { ColumnWidthUnit, SortOrder, TableUtils } from './table-utils';
import { Column } from './column';
import { ColumnOptions } from './column-options';
import { DomUtils } from './dom-utils';
import { Node } from './node';
import { TableOptions } from './table-options';

export abstract class AbstractTable<T> {
  private static readonly VIRTUAL_SCROLL_PADDING: number = 2;

  protected readonly containerElt: HTMLElement;
  protected readonly tableBodyElt: HTMLElement;
  protected readonly tableBodyRowElts: HTMLElement[];
  protected readonly tableElt: HTMLElement;
  protected readonly tableHeaderElt: HTMLElement;
  protected readonly tableHeaderRowElt: HTMLElement;
  protected readonly virtualScrollSpacerElt: HTMLElement;

  protected readonly options: TableOptions<T>;
  protected readonly virtualNodesCount: number;
  protected dataColumns: Column<T>[];
  protected nodes: Node<T>[];
  protected visibleNodeIndexes: number[];

  private readonly tableHeaderHeight: number;
  private activeNodeIndexes: number[];
  private counter: number;
  private currentFilter: { matcher: (value: T) => boolean } | null;
  private currentRangeStart: number | null;
  private currentSort: { column: Column<T>; sorter: (a: T, b: T) => number; sortOrder: SortOrder } | null;

  protected constructor(
    containerElt: HTMLElement,
    { columnOptions, tableOptions }: { columnOptions: ColumnOptions<T>[]; tableOptions: TableOptions<T> }
  ) {
    this.activeNodeIndexes = [];
    this.containerElt = containerElt;
    this.counter = 0;
    this.currentFilter = null;
    this.currentRangeStart = null;
    this.currentSort = null;
    this.dataColumns = this.initColumnOptions(columnOptions);
    this.nodes = [];
    this.options = tableOptions;
    this.virtualNodesCount = this.options.visibleNodes + AbstractTable.VIRTUAL_SCROLL_PADDING * 2;
    this.visibleNodeIndexes = [];

    this.virtualScrollSpacerElt = this.createVirtualScrollSpacerElt();
    this.tableBodyRowElts = this.createTableBodyRowElts();
    this.tableBodyElt = this.createTableBodyElt();
    this.tableHeaderRowElt = this.createTableHeaderRowElt();
    this.tableHeaderElt = this.createTableHeaderElt();
    this.tableElt = this.createTableElt();

    this.tableHeaderHeight = DomUtils.getRenderedSize(this.containerElt, this.tableHeaderElt).height;
  }

  // ////////////////////////////////////////////////////////////////////////////

  public deleteNodes(nodeIds: number[]): void {
    this.nodes = this.nodes.filter((node) => !nodeIds.includes(node.id));

    this.updateNodes();
  }

  public deselectNodes(nodeIds: number[]): void {
    if (this.isSelectionEnabled()) {
      (nodeIds.length > 0 ? this.getNodesById(nodeIds) : this.nodes).forEach((node) => (node.isSelected = false));

      // Update nodes selection indicator in table header
      if (this.nodes.every((node) => !node.isSelected)) {
        this.tableHeaderRowElt.classList.remove(TableUtils.SELECTED_CLS);
      }

      this.updateVisibleNodes(true);
    }
  }

  public filter(matcher: (value: T) => boolean): void {
    this.currentFilter = { matcher };

    this.updateNodes({ performFiltering: true });
  }

  public selectNodes(nodeIds: number[]): void {
    if (this.isSelectionEnabled()) {
      if (this.options.selectable === true) {
        (nodeIds.length > 0 ? this.getNodesById(nodeIds) : this.nodes).forEach((node) => (node.isSelected = true));
      } else {
        const selectableNodesCount =
          (this.options.selectable as number) - this.nodes.filter((node) => node.isSelected).length;

        if (nodeIds.length > 0) {
          this.getNodesById(nodeIds.slice(0, selectableNodesCount)).forEach((node) => (node.isSelected = true));
        } else {
          this.nodes.slice(0, selectableNodesCount).forEach((node) => (node.isSelected = true));
        }
      }
    }

    // Update nodes selection indicator in table header
    this.tableHeaderRowElt.classList.add(TableUtils.SELECTED_CLS);

    this.updateVisibleNodes(true);
  }

  public sort(columnId: number, sortOrder: SortOrder): void {
    const targetColumn = this.dataColumns.find((column) => column.id === columnId);

    if (targetColumn?.sorter != null) {
      this.currentSort = { sortOrder, column: targetColumn, sorter: targetColumn.sorter };

      this.updateNodes({ performSorting: true });
    }
  }

  public updateNodeHeight(nodeHeight: number): void {
    this.options.nodeHeight = nodeHeight;

    this.tableBodyRowElts.forEach((elt) => (elt.style.height = DomUtils.withPx(this.options.nodeHeight)));

    this.setVirtualScrollSpacerHeight();
  }

  // ////////////////////////////////////////////////////////////////////////////

  protected createTableBodyCellElt(column: Column<T>, _ctx: { nodeIndex: number }): HTMLElement {
    const elt = DomUtils.createElt('div', TableUtils.TABLE_CELL_CLS);
    if (column.classList) elt.classList.add(...column.classList);
    if (column.sorter) elt.classList.add(TableUtils.SORTABLE_CLS);
    if (column.pinned != null) {
      const targetColumnIndex = this.dataColumns.findIndex((_column) => _column.id === column.id);

      elt.classList.add(TableUtils.STICKY_CLS);
      if (column.pinned === 'left') {
        if (this.dataColumns.slice(targetColumnIndex + 1).every((_column) => _column.pinned !== 'left')) {
          elt.classList.add(TableUtils.STICKY_RIGHTMOST_CLS);
        }
      } else {
        if (this.dataColumns.slice(0, targetColumnIndex).every((_column) => _column.pinned !== 'right')) {
          elt.classList.add(TableUtils.STICKY_LEFTMOST_CLS);
        }
      }
    }

    elt.appendChild(this.createTableBodyCellContentElt(column));

    return elt;
  }

  protected generateId(): number {
    return this.counter++;
  }

  protected getDataCellElts(tableRowElt: HTMLElement): HTMLElement[] {
    const elts = [];
    const tableRowChildElts = tableRowElt.children;
    const startIndex = this.isSelectionEnabled() ? 1 : 0;
    const endIndex = this.options.rowActions ? tableRowChildElts.length - 1 : tableRowChildElts.length;

    for (let i = startIndex, len = endIndex; i < len; i++) {
      elts.push(tableRowChildElts.item(i) as HTMLElement);
    }

    return elts;
  }

  protected getNodeByIndex(index: number): Node<T> {
    return this.nodes[this.visibleNodeIndexes[index]];
  }

  protected init(): void {
    this.hideUnusedTableBodyRowElts();
    this.setColumnsWidth();

    this.containerElt.appendChild(this.tableElt);

    this.setStickyColumnsPosition();
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
      this.handleFilter(this.currentFilter.matcher);
    }
    if (options?.performSorting != null && options.performSorting && this.currentSort) {
      this.nodes = this.handleSort(this.currentSort.column, this.currentSort.sortOrder, this.currentSort.sorter);
    }

    this.setActiveNodeIndexes();

    this.updateVisibleNodes(true);
  }

  protected updateVisibleNodes(force = false): void {
    const newRangeStart = Math.floor(this.tableElt.scrollTop / this.options.nodeHeight);

    if (force || newRangeStart !== this.currentRangeStart) {
      this.currentRangeStart = newRangeStart;
      this.tableBodyElt.style.transform = `translateY(${DomUtils.withPx(newRangeStart * this.options.nodeHeight)})`;
      this.visibleNodeIndexes = this.activeNodeIndexes.slice(newRangeStart, newRangeStart + this.virtualNodesCount);

      this.hideUnusedTableBodyRowElts();
      this.populateVisibleNodes();
    }
  }

  // ////////////////////////////////////////////////////////////////////////////

  private convertToPixel({ value, unit }: { value: number; unit: ColumnWidthUnit }): number {
    switch (unit) {
      case '%':
        return DomUtils.getComputedWidth(this.containerElt) * (value / 100);

      default:
        return value;
    }
  }

  private createOverlayElt(onClose?: () => void): HTMLElement {
    const overlayElt = DomUtils.createElt('div', TableUtils.OVERLAY_CLS);

    const listener = (event: Event): void => {
      this.containerElt.removeChild(overlayElt);
      this.containerElt.removeEventListener('mouseup', listener, { capture: true });
      this.containerElt.removeEventListener('scroll', listener, { capture: true });

      onClose?.();

      if (!(event.target as HTMLElement).closest(`.${TableUtils.OVERLAY_CLS}`)) {
        event.stopPropagation();
      }
    };

    this.containerElt.addEventListener('mouseup', listener, { capture: true });
    this.containerElt.addEventListener('scroll', listener, { capture: true });

    return overlayElt;
  }

  private createResizeHandleElt(ctx: { columnIndex: number }): HTMLElement {
    const elt = DomUtils.createElt('div', TableUtils.RESIZE_HANDLE_CLS);
    elt.addEventListener('mousedown', (event) => {
      event.stopPropagation();
      this.onResizeColumn(ctx.columnIndex, event);
    });

    return elt;
  }

  private createSortHandleElt(sortOrder: 'asc' | 'desc', ctx: { columnIndex: number }): HTMLElement {
    const elt = DomUtils.createElt(
      'div',
      sortOrder === 'asc' ? TableUtils.SORT_ASC_HANDLE_CLS : TableUtils.SORT_DESC_HANDLE_CLS
    );
    elt.addEventListener('mouseup', (event) => {
      event.stopPropagation();
      this.onSortTable(ctx.columnIndex, sortOrder);
    });

    elt.appendChild(DomUtils.createElt('i'));

    return elt;
  }

  private createTableBodyCellContentElt(column: Column<T>): HTMLElement {
    return DomUtils.createElt('div', TableUtils.TABLE_CELL_CONTENT_CLS, TableUtils.getTextAlignCls(column.align));
  }

  private createTableBodyElt(): HTMLElement {
    const elt = DomUtils.createElt('div', TableUtils.TABLE_BODY_CLS);

    this.tableBodyRowElts.forEach((tableBodyRowElt) => elt.appendChild(tableBodyRowElt));

    return elt;
  }

  private createTableBodyRowActionsHandleElt(ctx: { nodeIndex: number }): HTMLElement {
    const elt = DomUtils.createElt('div', TableUtils.TABLE_ROW_ACTIONS_HANDLE_CLS);
    elt.addEventListener(
      'mouseup',
      (event) => {
        event.stopPropagation();
        this.onClickTableBodyRowActionsHandle(ctx.nodeIndex, event);
      },
      false
    );
    if (this.dataColumns.every((column) => column.pinned !== 'right')) {
      elt.classList.add(TableUtils.STICKY_LEFTMOST_CLS);
    }

    elt.appendChild(DomUtils.createElt('i'));

    return elt;
  }

  private createTableBodyRowElt(ctx: { nodeIndex: number }): HTMLElement {
    const elt = DomUtils.createElt('div', TableUtils.TABLE_ROW_CLS);
    elt.style.height = DomUtils.withPx(this.options.nodeHeight);
    elt.addEventListener('mouseup', () => this.onClickTableBodyRow(ctx.nodeIndex), false);

    if (this.isSelectionEnabled()) elt.appendChild(this.createTableBodyTickElt());

    this.dataColumns.forEach((column) => elt.appendChild(this.createTableBodyCellElt(column, ctx)));

    if (this.options.rowActions) elt.appendChild(this.createTableBodyRowActionsHandleElt(ctx));

    return elt;
  }

  private createTableBodyRowElts(): HTMLElement[] {
    return [...Array(this.virtualNodesCount).keys()].map((_, i) => this.createTableBodyRowElt({ nodeIndex: i }));
  }

  private createTableBodyTickElt(): HTMLElement {
    const elt = DomUtils.createElt('div', TableUtils.TABLE_CELL_TICK_CLS);

    elt.appendChild(DomUtils.createElt('i'));

    return elt;
  }

  private createTableElt(): HTMLElement {
    const elt = DomUtils.createElt('div', TableUtils.TABLE_CLS);
    elt.addEventListener('scroll', () => requestAnimationFrame(() => this.updateVisibleNodes()));

    elt.appendChild(this.tableHeaderElt);
    elt.appendChild(this.tableBodyElt);
    elt.appendChild(this.virtualScrollSpacerElt);

    return elt;
  }

  private createTableHeaderCellElt(column: Column<T>, ctx: { columnIndex: number }): HTMLElement {
    const elt = DomUtils.createElt('div', TableUtils.TABLE_CELL_CLS);
    elt.addEventListener('mouseup', () => this.onClickTableHeaderCell(ctx.columnIndex), false);
    if (column.classList) elt.classList.add(...column.classList);
    if (column.pinned != null) elt.classList.add(TableUtils.STICKY_CLS);

    elt.appendChild(this.createTableHeaderCellContentElt(column));

    if (column.sorter) {
      elt.classList.add(TableUtils.SORTABLE_CLS);

      elt.appendChild(this.createSortHandleElt('asc', ctx));
      elt.appendChild(this.createSortHandleElt('desc', ctx));
    }
    if (column.resizable != null) {
      elt.appendChild(this.createResizeHandleElt(ctx));
    }

    return elt;
  }

  private createTableHeaderCellContentElt(column: Column<T>): HTMLElement {
    const elt = DomUtils.createElt('div', TableUtils.TABLE_CELL_CONTENT_CLS, TableUtils.getTextAlignCls(column.align));
    elt.textContent = column.title ?? '';

    return elt;
  }

  private createTableHeaderElt(): HTMLElement {
    const elt = DomUtils.createElt('div', TableUtils.TABLE_HEADER_CLS, TableUtils.STICKY_CLS);

    elt.appendChild(this.tableHeaderRowElt);

    return elt;
  }

  private createTableHeaderRowElt(): HTMLElement {
    const elt = DomUtils.createElt('div', TableUtils.TABLE_ROW_CLS);

    if (this.isSelectionEnabled()) elt.appendChild(this.createTableHeaderTickElt());

    this.dataColumns.forEach((column, i) => elt.appendChild(this.createTableHeaderCellElt(column, { columnIndex: i })));

    if (this.options.rowActions) {
      const rowActionsHandleElt = DomUtils.createElt('div', TableUtils.TABLE_ROW_ACTIONS_HANDLE_CLS);
      if (this.dataColumns.every((column) => column.pinned !== 'right')) {
        rowActionsHandleElt.classList.add(TableUtils.STICKY_LEFTMOST_CLS);
      }

      elt.appendChild(rowActionsHandleElt);
    }

    return elt;
  }

  private createTableHeaderTickElt(): HTMLElement {
    const elt = DomUtils.createElt('div', TableUtils.TABLE_CELL_TICK_CLS);
    elt.addEventListener('mouseup', () => this.onClickTableHeaderTick());

    elt.appendChild(DomUtils.createElt('i'));

    return elt;
  }

  private createVirtualScrollSpacerElt(): HTMLElement {
    return DomUtils.createElt('div', TableUtils.VIRTUAL_SCROLL_SPACER_CLS);
  }

  private getColumnSortHandles(headerCellElt: HTMLElement): { sortAscElt: HTMLElement; sortDescElt: HTMLElement } {
    return {
      sortAscElt: headerCellElt.getElementsByClassName(TableUtils.SORT_ASC_HANDLE_CLS).item(0) as HTMLElement,
      sortDescElt: headerCellElt.getElementsByClassName(TableUtils.SORT_DESC_HANDLE_CLS).item(0) as HTMLElement
    };
  }

  private getNodesById(ids: number[]): Node<T>[] {
    return ids.map((id) => this.nodes.find((node) => node.id === id)).filter((node) => node) as Node<T>[];
  }

  private handleFilter(filter: (value: T) => boolean): void {
    const nodesLength = this.nodes.length;

    for (let i = nodesLength - 1; i >= 0; i--) {
      const node = this.nodes[i];

      node.isMatching = filter(node.value);

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

  private handleSort(column: Column<T>, sortOrder: SortOrder, sort: (a: T, b: T) => number): Node<T>[] {
    let sortedNodes: Node<T>[] = [];

    this.resetColumnSortHandles();

    if (sortOrder === 'default') {
      sortedNodes = this.nodes.sort((a, b) => a.initialPos - b.initialPos);
    } else {
      const orderedSort = (a: T, b: T): number => sort(a, b) * (sortOrder === 'asc' ? 1 : -1);
      const nodesLength = this.nodes.length;
      const rootNodes = [];
      const sortedChildrenByParentNodeId = new Map<number, Node<T>[]>();

      for (let i = 0; i < nodesLength; i++) {
        const node = this.nodes[i];
        const children = [];
        let nextnodeIndex = i + 1;

        while (nextnodeIndex < nodesLength && this.nodes[nextnodeIndex].level > node.level) {
          if (this.nodes[nextnodeIndex].level === node.level + 1) children.push(this.nodes[nextnodeIndex]);
          nextnodeIndex++;
        }

        sortedChildrenByParentNodeId.set(
          node.id,
          children.sort((a, b) => orderedSort(a.value, b.value) * -1)
        );

        if (node.level === 0) rootNodes.push(node);
      }

      const stack = rootNodes.sort((a, b) => orderedSort(a.value, b.value) * -1);

      while (stack.length > 0) {
        const node = stack.pop() as Node<T>;

        sortedNodes.push(node);
        Array.prototype.push.apply(stack, sortedChildrenByParentNodeId.get(node.id) as Node<T>[]);
      }
    }

    this.setColumnSortOrder(column, sortOrder);

    return sortedNodes;
  }

  private hideUnusedTableBodyRowElts(): void {
    for (let i = this.visibleNodeIndexes.length, len = this.tableBodyRowElts.length; i < len; i++) {
      this.tableBodyRowElts[i].classList.add(TableUtils.HIDDEN_CLS);
    }
  }

  private initColumnOptions(columnOptions: ColumnOptions<T>[]): Column<T>[] {
    return columnOptions
      .map((column) => ({ ...column, sortOrder: 'default' as const }))
      .sort((a, b) => {
        if (a.pinned === 'left' && b.pinned !== 'left') return -1;
        else if (b.pinned === 'left' && a.pinned !== 'left') return 1;

        return a.order - b.order;
      });
  }

  private isSelectionEnabled(): boolean {
    return (
      this.options.selectable != null &&
      ((typeof this.options.selectable === 'boolean' && this.options.selectable) ||
        (typeof this.options.selectable === 'number' && this.options.selectable > 0))
    );
  }

  private onClickTableBodyRow(nodeIndex: number): void {
    const node = this.getNodeByIndex(nodeIndex);

    if (node.isSelected) {
      this.deselectNodes([node.id]);
    } else {
      this.selectNodes([node.id]);
    }
  }

  private onClickTableBodyRowActionsHandle(nodeIndex: number, event: Event): void {
    const eventTarget = event.target as HTMLElement;
    const rowActionsHandleElt = eventTarget.closest(`.${TableUtils.TABLE_ROW_ACTIONS_HANDLE_CLS}`) as HTMLElement;
    if (this.options.rowActions && this.options.rowActions.length > 0) {
      const listElt = DomUtils.createElt('ul');
      const node = this.getNodeByIndex(nodeIndex);
      const overlayElt = this.createOverlayElt(() => rowActionsHandleElt.classList.remove(TableUtils.ACTIVE_CLS));

      const createRowActionsGroup = (rowActions: { callback: (item: T) => void; label: string }[]): void => {
        for (let i = 0, len = rowActions.length; i < len; i++) {
          const rowAction = rowActions[i];
          const listItemElt = DomUtils.createElt('li', TableUtils.LIST_ITEM_CLS);
          listItemElt.appendChild(document.createTextNode(rowAction.label));
          listElt.appendChild(listItemElt);

          listItemElt.addEventListener('mouseup', () => rowAction.callback(node.value));
        }
      };

      // Create overlay content
      createRowActionsGroup(this.options.rowActions[0]);
      for (let i = 1, len = this.options.rowActions.length; i < len; i++) {
        const listItemElt = DomUtils.createElt('li', TableUtils.LIST_DIVIDER_CLS);
        listElt.appendChild(listItemElt);
        const group = this.options.rowActions[i];
        createRowActionsGroup(group);
      }
      overlayElt.appendChild(listElt);

      // Set overlay size
      const { height, width } = DomUtils.getRenderedSize(this.containerElt, overlayElt);

      if (rowActionsHandleElt.getBoundingClientRect().top + height <= window.innerHeight) {
        overlayElt.style.top = DomUtils.withPx(rowActionsHandleElt.getBoundingClientRect().top);
      } else {
        overlayElt.style.top = DomUtils.withPx(rowActionsHandleElt.getBoundingClientRect().bottom - height);
      }

      if (width + rowActionsHandleElt.getBoundingClientRect().left + 40 <= window.innerWidth) {
        overlayElt.style.left = DomUtils.withPx(rowActionsHandleElt.getBoundingClientRect().left + 40);
      } else {
        overlayElt.style.left = DomUtils.withPx(rowActionsHandleElt.getBoundingClientRect().left - width);
      }
      overlayElt.style.maxHeight = DomUtils.withPx(window.innerHeight);

      // Append overlay
      this.containerElt.appendChild(overlayElt);
      rowActionsHandleElt.classList.add(TableUtils.ACTIVE_CLS);
    }
  }

  private onClickTableHeaderCell(columnIndex: number): void {
    this.sort(this.dataColumns[columnIndex].id, this.currentSort?.sortOrder === 'asc' ? 'desc' : 'asc');
  }

  private onClickTableHeaderTick(): void {
    if (this.nodes.every((node) => node.isSelected)) {
      this.deselectNodes([]);
    } else {
      this.selectNodes([]);
    }
  }

  private onResizeColumn(columnIndex: number, startEvent: MouseEvent): void {
    const headerCellElt = this.getDataCellElts(this.tableHeaderRowElt)[columnIndex];
    const originalColumnWidth = DomUtils.getComputedWidth(headerCellElt);
    const originalPageX = startEvent.pageX;

    let eventPageX: number;
    let isTicking = false;

    const updateColumnSize = (): void => {
      isTicking = false;

      const columnWidth = Math.max(this.options.columnMinWidth, originalColumnWidth + (eventPageX - originalPageX));

      this.setColumnWidth(columnIndex, columnWidth);

      this.setStickyColumnsPosition();
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

      window.removeEventListener('mouseup', stopResize, true);
      window.removeEventListener('mousemove', resize);
    };

    startEvent.preventDefault();

    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResize, true);
  }

  private onSortTable(columnIndex: number, sortOrder: SortOrder): void {
    this.sort(this.dataColumns[columnIndex].id, sortOrder === this.currentSort?.sortOrder ? 'default' : sortOrder);
  }

  private populateCellContent(cellElt: HTMLElement, fragment: DocumentFragment): void {
    const cellContentElt = cellElt.lastElementChild as HTMLElement;

    if (fragment.childElementCount > 0) {
      cellContentElt.innerHTML = '';
      cellContentElt.appendChild(fragment);
    } else {
      cellContentElt.textContent = fragment.textContent;
    }
  }

  private populateVisibleNodes(): void {
    const columnsLength = this.dataColumns.length;
    const defaultCellColor = { backgroundColor: '', color: '' };

    for (let i = 0, len = this.visibleNodeIndexes.length; i < len; i++) {
      this.tableBodyRowElts[i].classList.remove(TableUtils.HIDDEN_CLS);

      const node = this.getNodeByIndex(i);
      const nodeElt = this.tableBodyRowElts[i];
      const cellElts = this.getDataCellElts(nodeElt);
      const rowColor = this.options.rowColor?.(node.value);

      for (let j = 0; j < columnsLength; j++) {
        const cellElt = cellElts[j];
        const column = this.dataColumns[j];

        this.populateCellContent(cellElt, column.formatter(node.value));

        // Update cell color
        const cellColor = column.cellColor?.(node.value) ?? rowColor ?? defaultCellColor;
        cellElt.style.backgroundColor = cellColor.backgroundColor ?? cellElt.style.backgroundColor;
        cellElt.style.color = cellColor.color ?? cellElt.style.color;
      }

      // Update selection
      if (node.isSelected) {
        nodeElt.classList.add(TableUtils.SELECTED_CLS);
      } else {
        nodeElt.classList.remove(TableUtils.SELECTED_CLS);
      }
    }
  }

  private setActiveNodeIndexes(): void {
    this.activeNodeIndexes = [];

    this.nodes.forEach((node, i) => {
      if (node.isMatching && !node.isHidden) this.activeNodeIndexes.push(i);
    });

    this.setVirtualScrollSpacerHeight();
  }

  private resetColumnSortHandles(): void {
    this.dataColumns.forEach((column, i) => {
      if (column.sorter) {
        const headerCellElt = this.getDataCellElts(this.tableHeaderRowElt)[i];
        const { sortAscElt, sortDescElt } = this.getColumnSortHandles(headerCellElt);
        sortAscElt.classList.remove(TableUtils.ACTIVE_CLS);
        sortDescElt.classList.remove(TableUtils.ACTIVE_CLS);
      }
    });
  }

  private setColumnSortOrder(targetColumn: Column<T>, sortOrder: SortOrder): void {
    const targetColumnIndex = this.dataColumns.findIndex((column) => column.id === targetColumn.id);
    const headerCellElt = this.getDataCellElts(this.tableHeaderRowElt)[targetColumnIndex];
    const { sortAscElt, sortDescElt } = this.getColumnSortHandles(headerCellElt);

    targetColumn.sortOrder = sortOrder;

    if (sortOrder === 'asc') {
      sortAscElt.classList.add(TableUtils.ACTIVE_CLS);
    } else if (sortOrder === 'desc') {
      sortDescElt.classList.add(TableUtils.ACTIVE_CLS);
    }
  }

  private setColumnsWidth(): void {
    const columnsWidths: number[] = [];

    // Handle columns with explicit width
    this.dataColumns.forEach((column, i) => {
      if (column.width) {
        columnsWidths.splice(i, 0, this.convertToPixel(column.width));
      }
    });

    // Handle columns without explicit width
    const otherColumnsCount = this.dataColumns.filter((column) => !column.width).length;
    if (otherColumnsCount > 0) {
      const remainingWidth =
        DomUtils.getComputedWidth(this.containerElt) - columnsWidths.reduce((acc, x) => acc + x, 0);

      if (remainingWidth > 0) {
        const columnWidth = remainingWidth / otherColumnsCount;

        this.dataColumns.forEach((column, i) => {
          if (!column.width) {
            columnsWidths.splice(i, 0, columnWidth);
          }
        });
      }
    }

    columnsWidths.forEach((width, i) => this.setColumnWidth(i, width));
  }

  private setColumnWidth(columnIndex: number, width: number): void {
    const widthInPx = DomUtils.withPx(width);

    this.getDataCellElts(this.tableHeaderRowElt)[columnIndex].style.width = widthInPx;
    for (let i = 0, len = this.tableBodyRowElts.length; i < len; i++) {
      this.getDataCellElts(this.tableBodyRowElts[i])[columnIndex].style.width = widthInPx;
    }
  }

  private setStickyColumnsPosition(): void {
    const tableHeaderCellElts = this.getDataCellElts(this.tableHeaderRowElt);

    const stickyDataColumnsWidth = [];
    for (let i = 0, dataColumnsLen = this.dataColumns.length; i < dataColumnsLen; i++) {
      stickyDataColumnsWidth.push(this.dataColumns[i].pinned != null ? DomUtils.getWidth(tableHeaderCellElts[i]) : 0);
    }
    const stickyDataColumnsWidthLen = stickyDataColumnsWidth.length;

    let tickCellWidth = 0;
    if (this.options.selectable != null) {
      const tickCellElt = this.tableHeaderRowElt.firstElementChild as HTMLElement;
      if (tickCellElt.classList.contains(TableUtils.STICKY_CLS)) {
        tickCellWidth = DomUtils.getComputedWidth(tickCellElt);
      }
    }

    let rowActionsHandleCellWidth = 0;
    if (this.options.rowActions) {
      const rowActionsHandleElt = this.tableHeaderRowElt.lastElementChild as HTMLElement;
      if (rowActionsHandleElt.classList.contains(TableUtils.STICKY_CLS)) {
        rowActionsHandleCellWidth = DomUtils.getComputedWidth(rowActionsHandleElt);
      }
    }

    for (let i = 0, tableHeaderCellEltsLen = tableHeaderCellElts.length; i < tableHeaderCellEltsLen; i++) {
      const column = this.dataColumns[i];
      const tableHeaderCellElt = tableHeaderCellElts[i];

      if (column.pinned === 'left') {
        let offset = tickCellWidth;
        for (let j = 0; j < i; j++) offset += stickyDataColumnsWidth[j];
        const offsetInPx = DomUtils.withPx(offset);

        tableHeaderCellElt.style.left = offsetInPx;
        for (let j = 0, tableBodyRowEltsLen = this.tableBodyRowElts.length; j < tableBodyRowEltsLen; j++) {
          this.getDataCellElts(this.tableBodyRowElts[j])[i].style.left = offsetInPx;
        }
      } else if (column.pinned === 'right') {
        let offset = rowActionsHandleCellWidth;
        for (let j = i + 1; j < stickyDataColumnsWidthLen; j++) offset += stickyDataColumnsWidth[j];
        const offsetInPx = DomUtils.withPx(offset);

        tableHeaderCellElt.style.right = offsetInPx;
        for (let j = 0, tableBodyRowEltsLen = this.tableBodyRowElts.length; j < tableBodyRowEltsLen; j++) {
          this.getDataCellElts(this.tableBodyRowElts[j])[i].style.right = offsetInPx;
        }
      }
    }
  }

  private setVirtualScrollSpacerHeight(): void {
    const height = this.activeNodeIndexes.length * this.options.nodeHeight + this.tableHeaderHeight;
    this.virtualScrollSpacerElt.style.height = DomUtils.withPx(height);
  }
}
