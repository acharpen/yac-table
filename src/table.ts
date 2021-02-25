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
    this.dataColumns = columnOptions.map((column) => ({ ...column, sortOrder: 'default' }));
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
    const elt = DomUtils.createDiv(TableUtils.TABLE_CELL_CLS);
    if (column.classList) elt.classList.add(...column.classList);
    if (column.sorter) elt.classList.add(TableUtils.SORTABLE_CLS);
    if (column.sticky != null) elt.classList.add(TableUtils.STICKY_CLS);

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

  private createResizeHandleElt(ctx: { columnIndex: number }): HTMLElement {
    const elt = DomUtils.createDiv(TableUtils.RESIZE_HANDLE_CLS);
    elt.addEventListener('mousedown', (event) => {
      event.stopPropagation();
      this.onResizeColumn(ctx.columnIndex, event);
    });

    return elt;
  }

  private createSortHandleElt(sortOrder: 'asc' | 'desc', ctx: { columnIndex: number }): HTMLElement {
    const elt = DomUtils.createDiv(
      sortOrder === 'asc' ? TableUtils.SORT_ASC_HANDLE_CLS : TableUtils.SORT_DESC_HANDLE_CLS
    );
    elt.addEventListener('mouseup', (event) => {
      event.stopPropagation();
      this.onSortTable(ctx.columnIndex, sortOrder);
    });

    return elt;
  }

  private createTableBodyCellContentElt(column: Column<T>): HTMLElement {
    return DomUtils.createDiv(TableUtils.TABLE_CELL_CONTENT_CLS, TableUtils.getTextAlignmentCls(column.align));
  }

  private createTableBodyElt(): HTMLElement {
    const elt = DomUtils.createDiv(TableUtils.TABLE_BODY_CLS);

    this.tableBodyRowElts.forEach((tableBodyRowElt) => elt.appendChild(tableBodyRowElt));

    return elt;
  }

  private createTableBodyRowActionsHandleElt(ctx: { nodeIndex: number }): HTMLElement {
    const elt = DomUtils.createDiv(TableUtils.TABLE_ROW_ACTIONS_HANDLE_CLS);
    elt.innerHTML = TableUtils.getEllipsisIcon();
    elt.addEventListener(
      'mouseup',
      (event) => {
        event.stopPropagation();
        this.onClickTableBodyRowActionsHandle(ctx.nodeIndex, event);
      },
      false
    );

    return elt;
  }

  private createTableBodyRowElt(ctx: { nodeIndex: number }): HTMLElement {
    const elt = DomUtils.createDiv(TableUtils.TABLE_ROW_CLS);
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
    const elt = DomUtils.createDiv(TableUtils.TABLE_CELL_CHECK_CLS);
    elt.innerHTML = TableUtils.getTickIcon();

    return elt;
  }

  private createTableElt(): HTMLElement {
    const elt = DomUtils.createDiv(TableUtils.TABLE_CLS);
    elt.addEventListener('scroll', () => requestAnimationFrame(() => this.updateVisibleNodes()));

    elt.appendChild(this.tableHeaderElt);
    elt.appendChild(this.tableBodyElt);
    elt.appendChild(this.virtualScrollSpacerElt);

    return elt;
  }

  private createTableHeaderCellElt(column: Column<T>, ctx: { columnIndex: number }): HTMLElement {
    const elt = DomUtils.createDiv(TableUtils.TABLE_CELL_CLS);
    elt.addEventListener('mouseup', () => this.onClickTableHeaderCell(ctx.columnIndex), false);
    if (column.classList) elt.classList.add(...column.classList);
    if (column.sticky != null) elt.classList.add(TableUtils.STICKY_CLS);

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
    const elt = DomUtils.createDiv(TableUtils.TABLE_CELL_CONTENT_CLS, TableUtils.getTextAlignmentCls(column.align));
    elt.textContent = column.title ?? '';

    return elt;
  }

  private createTableHeaderElt(): HTMLElement {
    const elt = DomUtils.createDiv(TableUtils.TABLE_HEADER_CLS, TableUtils.STICKY_CLS);

    elt.appendChild(this.tableHeaderRowElt);

    return elt;
  }

  private createTableHeaderRowElt(): HTMLElement {
    const elt = DomUtils.createDiv(TableUtils.TABLE_ROW_CLS);

    if (this.isSelectionEnabled()) elt.appendChild(this.createTableHeaderTickElt());

    this.dataColumns.forEach((column, i) => elt.appendChild(this.createTableHeaderCellElt(column, { columnIndex: i })));

    if (this.options.rowActions) {
      elt.appendChild(DomUtils.createDiv(TableUtils.TABLE_ROW_ACTIONS_HANDLE_CLS, TableUtils.STICKY_CLS));
    }

    return elt;
  }

  private createTableHeaderTickElt(): HTMLElement {
    const elt = DomUtils.createDiv(TableUtils.TABLE_CELL_CHECK_CLS);
    elt.innerHTML = TableUtils.getTickIcon();
    elt.addEventListener('mouseup', () => this.onClickTableHeaderTick());

    return elt;
  }

  private createVirtualScrollSpacerElt(): HTMLElement {
    return DomUtils.createDiv(TableUtils.VIRTUAL_SCROLL_SPACER_CLS);
  }

  private getColumnSortHandles(headerCellElt: HTMLElement): { sortAscElt: HTMLElement; sortDescElt: HTMLElement } {
    return {
      sortAscElt: headerCellElt.getElementsByClassName(TableUtils.SORT_ASC_HANDLE_CLS).item(0) as HTMLElement,
      sortDescElt: headerCellElt.getElementsByClassName(TableUtils.SORT_DESC_HANDLE_CLS).item(0) as HTMLElement
    };
  }

  private getNodeByIndex(index: number): Node<T> {
    return this.nodes[this.visibleNodeIndexes[index]];
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
    const sortedNodes: Node<T>[] = [];

    this.resetColumnSortHandles();

    if (sortOrder === 'default') {
      Array.prototype.push.apply(
        sortedNodes,
        this.nodes.sort((a, b) => a.initialPos - b.initialPos)
      );
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
    const node = this.getNodeByIndex(nodeIndex);
    const a = eventTarget.closest(`.${TableUtils.TABLE_ROW_ACTIONS_HANDLE_CLS}`);
    if (a && this.options.rowActions && this.options.rowActions.length > 0) {
      const b = a as HTMLElement;
      b.classList.add(TableUtils.ACTIVE_CLS);
      const e = DomUtils.createDiv('yac-table-row-actions-overlay');
      const listElt = DomUtils.createElt('ul', 'list');

      const m = (event2: Event) => {
        window.removeEventListener('mouseup', m, false);
        this.tableElt.removeEventListener('scroll', m2);

        event2.stopPropagation();
        this.containerElt.removeChild(e);
        b.classList.remove(TableUtils.ACTIVE_CLS);
      };
      const m2 = (event2: Event) => {
        this.tableElt.removeEventListener('scroll', m2);
        window.removeEventListener('mouseup', m, false);

        event2.stopPropagation();
        this.containerElt.removeChild(e);
        b.classList.remove(TableUtils.ACTIVE_CLS);
      };

      if ((this.containerElt.lastElementChild as HTMLElement).classList.contains('yac-table-row-actions-overlay')) {
        this.tableElt.removeEventListener('scroll', m2);
        window.removeEventListener('mouseup', m, false);
        this.containerElt.lastElementChild?.remove();

        const p = this.tableBodyRowElts.filter((tableBodyRowElt) =>
          (tableBodyRowElt.lastElementChild as HTMLElement).classList.contains(TableUtils.ACTIVE_CLS)
        );
        console.log(p);
        // p?.classList.remove(TableUtils.ACTIVE_CLS);

        return;
      }

      const createRowActionsGroup = (rowActions: { callback: (item: T) => void; label: string }[]): void => {
        for (let i = 0, len = rowActions.length; i < len; i++) {
          const rowAction = rowActions[i];
          const listItemElt = DomUtils.createElt('li', 'list-item');
          listItemElt.appendChild(document.createTextNode(rowAction.label));
          listElt.appendChild(listItemElt);

          listItemElt.addEventListener('mouseup', () => rowAction.callback(node.value));
        }
      };
      createRowActionsGroup(this.options.rowActions[0]);
      for (let i = 1, len = this.options.rowActions.length; i < len; i++) {
        const listItemElt = DomUtils.createElt('li', 'divider');
        listElt.appendChild(listItemElt);
        const group = this.options.rowActions[i];
        createRowActionsGroup(group);
      }
      e.appendChild(listElt);
      const { height, width } = DomUtils.getRenderedSize(this.containerElt, e);
      // Height
      if (b.getBoundingClientRect().top + height <= window.innerHeight) {
        e.style.top = DomUtils.withPx(b.getBoundingClientRect().top);
      } else {
        e.style.top = DomUtils.withPx(b.getBoundingClientRect().bottom - height);
      }
      // Width
      if (width + b.getBoundingClientRect().left + 40 <= window.innerWidth) {
        e.style.left = DomUtils.withPx(b.getBoundingClientRect().left + 40);
      } else {
        e.style.left = DomUtils.withPx(b.getBoundingClientRect().left - width);
      }
      e.style.maxHeight = DomUtils.withPx(window.innerHeight);
      this.containerElt.appendChild(e);

      // window.addEventListener('mouseup', m, true);
      window.addEventListener('mouseup', m, false);
      // window.addEventListener('scroll', m2);
      this.tableElt.addEventListener('scroll', m2);
    }
    // // const tableBodyRowElt = this.tableBodyRowElts[nodeIndex];
    // // const tableBodyRowActionsHandleElt = tableBodyRowElt.lastElementChild as HTMLElement;
    // // const tableBodyRowActionsElt = tableBodyRowActionsHandleElt.lastElementChild as HTMLElement;
    // // if (tableBodyRowActionsHandleElt.classList.contains(TableUtils.ACTIVE_CLS)) {
    // //   tableBodyRowActionsHandleElt.classList.remove(TableUtils.ACTIVE_CLS);
    // //   tableBodyRowActionsElt.innerHTML = '';
    // // } else {
    // //   tableBodyRowActionsElt.appendChild(this.createTableBodyRowActionsContentElt(this.getNodeByIndex(nodeIndex)));
    // //   tableBodyRowActionsHandleElt.classList.add(TableUtils.ACTIVE_CLS);
    // }
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

      const node = this.nodes[this.visibleNodeIndexes[i]];
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
      stickyDataColumnsWidth.push(this.dataColumns[i].sticky != null ? DomUtils.getWidth(tableHeaderCellElts[i]) : 0);
    }
    const stickyDataColumnsWidthLen = stickyDataColumnsWidth.length;

    let checkCellWidth = 0;
    if (this.options.selectable != null) {
      const checkCellElt = this.tableHeaderRowElt.firstElementChild as HTMLElement;
      if (checkCellElt.classList.contains(TableUtils.STICKY_CLS)) {
        checkCellWidth = DomUtils.getComputedWidth(checkCellElt);
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

      if (column.sticky === 'left') {
        let offset = checkCellWidth;
        for (let j = 0; j < i; j++) offset += stickyDataColumnsWidth[j];
        const offsetInPx = DomUtils.withPx(offset);

        tableHeaderCellElt.style.left = offsetInPx;
        for (let j = 0, tableBodyRowEltsLen = this.tableBodyRowElts.length; j < tableBodyRowEltsLen; j++) {
          this.getDataCellElts(this.tableBodyRowElts[j])[i].style.left = offsetInPx;
        }
      } else if (column.sticky === 'right') {
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
