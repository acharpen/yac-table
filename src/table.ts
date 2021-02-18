import { Column, ColumnView } from './column';
import { ColumnSortMode, ColumnWidthUnit } from './column-utils';
import { ColumnOptions } from './column-options';
import { DomUtils } from './dom-utils';
import { Node } from './node';
import { TableOptions } from './table-options';
import { TableUtils } from './table-utils';

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
  protected columns: Column<T>[];
  protected nodes: Node<T>[];
  protected visibleNodeIndexes: number[];

  private readonly tableHeaderHeight: number;
  private activeNodeIndexes: number[];
  private counter: number;
  private currentFilter: { filter: (value: T) => boolean } | null;
  private currentRangeStart: number | null;
  private currentSort: { column: Column<T>; mode: ColumnSortMode; sort: (a: T, b: T) => number } | null;
  // private currentScrollX: number;
  // private currentScrollY: number;

  protected constructor(
    containerElt: HTMLElement,
    { columnOptions, tableOptions }: { columnOptions: ColumnOptions<T>[]; tableOptions: TableOptions<T> }
  ) {
    this.activeNodeIndexes = [];
    this.columns = columnOptions.map((column) => ({ ...column, sortMode: 'default' }));
    this.containerElt = containerElt;
    this.counter = 0;
    this.currentFilter = null;
    this.currentRangeStart = null;
    this.currentSort = null;
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

    this.tableHeaderHeight = this.computeTableHeaderHeight();
  }

  // ////////////////////////////////////////////////////////////////////////////

  // ////////////////////////////////////////////////////////////////////////////

  protected createTableBodyCellElt(column: Column<T>, _ctx: { nodeIndex: number }): HTMLElement {
    const elt = DomUtils.createDiv(TableUtils.TABLE_CELL_CLS);
    if (column.classList) elt.classList.add(...column.classList);
    if (column.stick != null) elt.classList.add(TableUtils.STICKY_CLS);

    elt.appendChild(this.createTableBodyCellContentElt(column));

    return elt;
  }

  protected generateId(): number {
    return this.counter++;
  }

  protected getTableRowCellElts(tableRowElt: HTMLElement): HTMLElement[] {
    const elts = [];
    const tableRowChildElts = tableRowElt.children;

    for (let i = 0, len = tableRowChildElts.length; i < len; i++) {
      elts.push(tableRowChildElts.item(i) as HTMLElement);
    }

    return elts;
  }

  protected init(): void {
    this.hideUnusedTableBodyRowElts();
    this.setTableColumnsWidth();

    this.setStickyTableColumnsPosition();
    this.setTableRowsWidth();

    this.containerElt.appendChild(this.tableElt);
  }

  protected setActiveNodeIndexes(): void {
    this.activeNodeIndexes = [];

    this.nodes.forEach((node, i) => {
      if (node.isMatching && !node.isHidden) this.activeNodeIndexes.push(i);
    });

    this.setVirtualScrollSpacerHeight();
  }

  protected setNodes(nodes: Node<T>[]): void {
    // TODO
    this.currentFilter = null;
    this.currentSort = null;
    this.nodes = nodes;
    //
    // this.resetColumnSortHandles();
    //
    this.updateNodes();
  }

  protected updateNodes(options?: { performFiltering?: boolean; performSorting?: boolean }): void {
    // TODO
    if (options?.performFiltering != null && options.performFiltering && this.currentFilter) {
      // this.handleFilter(this.currentFilter.matchFunc);
    }
    if (options?.performSorting != null && options.performSorting && this.currentSort) {
      // this.nodes = this.handleSort(this.currentSort.column, this.currentSort.mode, this.currentSort.compareFunc);
    }

    this.setActiveNodeIndexes();

    this.updateVisibleNodes();
  }

  protected updateVisibleNodes(): void {
    const newRangeStart = Math.floor(this.tableElt.scrollTop / this.options.nodeHeight);

    if (newRangeStart !== this.currentRangeStart) {
      this.currentRangeStart = newRangeStart;
      this.tableBodyElt.style.transform = `translateY(${newRangeStart * this.options.nodeHeight}px)`;
      this.visibleNodeIndexes = this.activeNodeIndexes.slice(newRangeStart, newRangeStart + this.virtualNodesCount);

      this.resetTableBodyRowElts();

      this.populateVisibleNodes();

      this.hideUnusedTableBodyRowElts();
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
    elt.addEventListener('mousedown', (event) => this.onResizeColumn(event, ctx.columnIndex));

    return elt;
  }

  private createSortHandleElt(mode: 'asc' | 'desc', ctx: { columnIndex: number }): HTMLElement {
    const elt = DomUtils.createDiv(mode === 'asc' ? TableUtils.SORT_ASC_HANDLE_CLS : TableUtils.SORT_DESC_HANDLE_CLS);
    elt.addEventListener('mouseup', (event) => this.onSortColumn(event, ctx.columnIndex, mode));

    return elt;
  }

  private createTableBodyCellContentElt(column: Column<T>): HTMLElement {
    const elt = DomUtils.createDiv(TableUtils.TABLE_CELL_CONTENT_CLS, TableUtils.getTextAlignmentCls(column.align));

    return elt;
  }

  private createTableBodyElt(): HTMLElement {
    const elt = DomUtils.createDiv(TableUtils.TABLE_BODY_CLS);

    this.tableBodyRowElts.forEach((tableBodyRowElt) => elt.appendChild(tableBodyRowElt));

    return elt;
  }

  private createTableBodyRowElt(ctx: { nodeIndex: number }): HTMLElement {
    const elt = DomUtils.createDiv(TableUtils.TABLE_ROW_CLS);
    elt.style.height = DomUtils.formatInPx(this.options.nodeHeight);
    elt.addEventListener('mouseup', (event) => this.onClickNode(event, ctx.nodeIndex));

    this.columns.forEach((column) => elt.appendChild(this.createTableBodyCellElt(column, ctx)));

    return elt;
  }

  private createTableBodyRowElts(): HTMLElement[] {
    return [...Array(this.virtualNodesCount).keys()].map((_, i) => this.createTableBodyRowElt({ nodeIndex: i }));
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
    // TODO
    const elt = DomUtils.createDiv(TableUtils.TABLE_CELL_CLS);
    elt.addEventListener('mouseup', (event) => this.onClickTableHeaderCell(event, ctx.columnIndex));
    if (column.classList) elt.classList.add(...column.classList);
    if (column.stick != null) elt.classList.add(TableUtils.STICKY_CLS);

    elt.appendChild(this.createTableHeaderCellContentElt(column));

    if (column.resize != null) {
      elt.appendChild(this.createResizeHandleElt(ctx));
    }
    if (column.sort != null) {
      // elt.classList.add(`${TableUtils.TABLE_CELL_CLS}-sortable`);

      elt.appendChild(this.createSortHandleElt('asc', ctx));
      elt.appendChild(this.createSortHandleElt('desc', ctx));
    }

    return elt;
  }

  private createTableHeaderCellContentElt(column: Column<T>): HTMLElement {
    const elt = DomUtils.createDiv(TableUtils.TABLE_CELL_CONTENT_CLS, TableUtils.getTextAlignmentCls(column.align));
    elt.textContent = column.title ?? '';

    return elt;
  }

  private computeTableHeaderHeight(): number {
    const clone = this.tableHeaderElt.cloneNode() as HTMLElement;
    clone.style.visibility = 'hidden';

    this.containerElt.appendChild(clone);

    const height = DomUtils.getComputedHeight(clone);

    this.containerElt.removeChild(clone);

    return height;
  }

  private createTableHeaderElt(): HTMLElement {
    const elt = DomUtils.createDiv(TableUtils.TABLE_HEADER_CLS);
    elt.appendChild(this.tableHeaderRowElt);

    return elt;
  }

  private createTableHeaderRowElt(): HTMLElement {
    const elt = DomUtils.createDiv(TableUtils.TABLE_ROW_CLS);
    this.columns.forEach((column, i) => elt.appendChild(this.createTableHeaderCellElt(column, { columnIndex: i })));

    return elt;
  }

  private createVirtualScrollSpacerElt(): HTMLElement {
    const elt = DomUtils.createDiv(TableUtils.VIRTUAL_SCROLL_SPACER_CLS);

    return elt;
  }

  private hideUnusedTableBodyRowElts(): void {
    for (let i = this.visibleNodeIndexes.length, len = this.tableBodyRowElts.length; i < len; i++) {
      this.tableBodyRowElts[i].classList.add(TableUtils.HIDDEN_CLS);
    }
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
    const columnsLength = this.columns.length;
    const defaultCellColor = { backgroundColor: '', color: '' };

    for (let i = 0, len = this.visibleNodeIndexes.length; i < len; i++) {
      const node = this.nodes[this.visibleNodeIndexes[i]];
      const nodeElt = this.tableBodyRowElts[i];
      const cellElts = this.getTableRowCellElts(nodeElt);
      const rowColor = this.options.rowColor?.(node.value);

      for (let j = 0; j < columnsLength; j++) {
        const cellElt = cellElts[j];
        const column = this.columns[j];

        this.populateCellContent(cellElt, column.formatter(node.value));

        // Update cell color
        const cellColor = column.cellColor?.(node.value) ?? rowColor ?? defaultCellColor;
        cellElt.style.backgroundColor = cellColor.backgroundColor ?? cellElt.style.backgroundColor;
        cellElt.style.color = cellColor.color ?? cellElt.style.color;
      }

      // Mark selection
      if (node.isSelected) {
        nodeElt.classList.add('selected');
      }
    }
  }

  private setTableColumnsWidth(): void {
    let columnsWidth = 0;

    // Set widths from columns definition
    this.columns.forEach((column, i) => {
      if (column.width) {
        const columnWidth = this.convertToPixel(column.width);

        this.setTableColumnWidth(i, columnWidth);
        columnsWidth += columnWidth;
      }
    });

    // Distribute remaining width to other columns
    const remainingWidth = DomUtils.getComputedWidth(this.containerElt) - columnsWidth;

    if (remainingWidth > 0) {
      const columnWidth = remainingWidth / this.columns.filter((column) => !column.width).length;

      this.columns.forEach((column, i) => {
        if (!column.width) {
          this.setTableColumnWidth(i, columnWidth);
        }
      });
    }
  }

  private resetTableBodyRowElts(): void {
    for (let i = 0, len = this.tableBodyRowElts.length; i < len; i++) {
      this.tableBodyRowElts[i].classList.remove(TableUtils.HIDDEN_CLS, TableUtils.SELECTED_CLS);
    }
  }

  private setStickyTableColumnsPosition(): void {
    const tableHeaderCellElts = this.getTableRowCellElts(this.tableHeaderRowElt);
    const columnsWitdth = tableHeaderCellElts.map((elt) => DomUtils.getEltWidth(elt));

    tableHeaderCellElts.forEach((tableHeaderCellElt, i) => {
      if (this.columns[i].stick === 'left') {
        const offset = DomUtils.formatInPx(columnsWitdth.slice(0, i).reduce((acc, x) => acc + x, 0));
        tableHeaderCellElt.style.left = offset;
        this.tableBodyRowElts.forEach((elt) => (this.getTableRowCellElts(elt)[i].style.left = offset));
      } else if (this.columns[i].stick === 'right') {
        const offset = DomUtils.formatInPx(columnsWitdth.slice(i + 1).reduce((acc, x) => acc + x, 0));
        tableHeaderCellElt.style.right = offset;
        this.tableBodyRowElts.forEach((elt) => (this.getTableRowCellElts(elt)[i].style.right = offset));
      }
    });
  }

  private setTableColumnWidth(columnIndex: number, width: number): void {
    const formattedWidth = `${width}px`;

    this.getTableRowCellElts(this.tableHeaderRowElt)[columnIndex].style.width = formattedWidth;
    for (let i = 0, len = this.tableBodyRowElts.length; i < len; i++) {
      this.getTableRowCellElts(this.tableBodyRowElts[i])[columnIndex].style.width = formattedWidth;
    }
  }

  private setTableRowsWidth(): void {
    const width = this.getTableRowCellElts(this.tableHeaderRowElt)
      .map((elt) => DomUtils.getEltWidth(elt))
      .reduce((acc, x) => acc + x, 0);
    const formattedWidth = `${width}px`;

    this.tableHeaderElt.style.width = formattedWidth;
    this.tableBodyElt.style.width = formattedWidth;
  }

  private setVirtualScrollSpacerHeight(): void {
    const height = this.activeNodeIndexes.length * this.options.nodeHeight + this.tableHeaderHeight;
    this.virtualScrollSpacerElt.style.height = DomUtils.formatInPx(height);
  }

  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////
  // ////////////////////////////////////////////////////////////////////////////

  // public addColumn(
  //   columnOption: Omit<ColumnOptions<T>, 'width'> & { width: { value: number; unit: ColumnWidthUnit } },
  //   { position, refColumnId }: { position: 'start' | 'end'; refColumnId?: number }
  // ): void {
  //   const isBebore = position === 'start';
  //   const refColumnIndex = refColumnId != null ? this.columns.findIndex((column) => column.id === refColumnId) : -1;
  //   const newColumnIndex =
  //     refColumnIndex !== -1 ? (isBebore ? refColumnIndex : refColumnIndex + 1) : isBebore ? 0 : this.columns.length;

  //   this.handleAddColumn(columnOption, newColumnIndex);
  // }

  // public deleteColumn(columnId: number): void {
  //   const columnIndex = this.columns.findIndex((column) => column.id === columnId);

  //   if (columnIndex !== -1) {
  //     this.handleDeleteColumn(columnIndex);
  //   }
  // }

  // public deleteNodes(nodeIds: number[]): void {
  //   this.nodes = this.nodes.filter((node) => !nodeIds.includes(node.id));

  //   this.updateNodes();
  // }

  // public deselectNodes(nodeIds: number[]): void {
  //   this.toggleNodesSelection(nodeIds, false);

  //   // Update nodes selection indicator in table header
  //   if (this.nodes.every((node) => !node.isSelected)) {
  //     this.tableHeaderRowElt.classList.remove('selected');
  //   }

  //   this.updateVisibleNodes();
  // }

  // public filter(matchFunc: (value: T) => boolean): void {
  //   this.currentFilter = { matchFunc };

  //   this.updateNodes({ performFiltering: true });
  // }

  // public selectNodes(nodeIds: number[]): void {
  //   this.toggleNodesSelection(nodeIds, true);

  //   // Update nodes selection indicator in table header
  //   if (this.nodes.some((node) => node.isSelected)) {
  //     this.tableHeaderRowElt.classList.add('selected');
  //   }

  //   this.updateVisibleNodes();
  // }

  // public sort(columnId: number, mode: ColumnSortMode, compareFunc: (a: T, b: T) => number): void {
  //   const targetColumn = this.columns.find((column) => column.id === columnId);

  //   if (targetColumn?.isSortable != null && targetColumn.isSortable) {
  //     this.currentSort = { column: targetColumn, mode, compareFunc };

  //     this.updateNodes({ performSorting: true });
  //   }
  // }

  // public updateNodeHeight(nodeHeight: number): void {
  //   this.options.nodeHeight = nodeHeight;

  //   this.tableNodeElts.forEach((nodeElt) => {
  //     nodeElt.style.height = `${this.options.nodeHeight}px`;
  //   });

  //   this.setTableBodyHeight();
  //   this.setVirtualTableHeight();
  // }

  // // ////////////////////////////////////////////////////////////////////////////

  // protected abstract dispatchEventClickNode(originalEvent: Event, node: Node<T>): void;

  // // ////////////////////////////////////////////////////////////////////////////

  // protected createTableCell(column: Column<T>, _ctx: { nodeIndex: number }): HTMLElement {
  //   const elt = DomUtils.createDiv(AbstractTable.CELL_CLS);
  //   elt.appendChild(DomUtils.createDiv(AbstractTable.CELL_CONTENT_CLS, column.align));

  //   if (column.classList) {
  //     elt.classList.add(...column.classList);
  //   }
  //   if (column.isSortable) {
  //     elt.classList.add('sortable');
  //   }

  //   return elt;
  // }

  // protected getTableRowCells(tableNodeElt: HTMLElement): HTMLElement[] {
  //   const tableCells = [];
  //   const tableNodeEltChildren = tableNodeElt.children;
  //   for (let i = 0, len = tableNodeEltChildren.length; i < len; i++) {
  //     tableCells.push(tableNodeEltChildren.item(i) as HTMLElement);
  //   }

  //   return tableCells;
  // }

  // protected handleAddColumn(
  //   columnOption: ColumnOptions<T> & Required<Pick<ColumnOptions<T>, 'width'>>,
  //   newColumnIndex: number
  // ): void {
  //   const isNewLastColumn = newColumnIndex === this.columns.length;
  //   const newColumn: Column<T> = { ...columnOption, sortMode: 'default' };
  //   const newColumnWidth = this.convertInPixel(columnOption.width);

  //   const insertNewElt = (elt: HTMLElement, parentElt: HTMLElement): void => {
  //     const tableNodeCells = this.getTableRowCells(elt);

  //     if (isNewLastColumn) {
  //       tableNodeCells[0].insertAdjacentElement('afterend', elt);
  //       parentElt.appendChild(elt);
  //     } else {
  //       tableNodeCells[newColumnIndex].insertAdjacentElement('beforebegin', elt);
  //     }

  //     elt.style.width = `${newColumnWidth}px`;
  //   };

  //   const unfreeze = (elt: HTMLElement): void => {
  //     const tableNodeCells = this.getTableRowCells(elt);
  //     for (let i = 0; i < this.options.frozenColumns; i++) {
  //       tableNodeCells[i].classList.remove('frozen');
  //       tableNodeCells[i].style.left = '';
  //     }
  //   };

  //   //
  //   this.columns.splice(newColumnIndex, 0, newColumn);

  //   // Clear frozen context
  //   if (this.options.frozenColumns && newColumnIndex <= this.options.frozenColumns) {
  //     this.updateFirstUnfrozenColumnOffset('');

  //     if (newColumnIndex < this.options.frozenColumns) {
  //       unfreeze(this.tableHeaderRowElt);

  //       this.tableNodeElts.forEach((nodeElt) => {
  //         unfreeze(nodeElt);
  //       });
  //     }
  //   }

  //   // Add new elements
  //   insertNewElt(this.createTableHeaderCell(newColumn, { columnIndex: newColumnIndex }), this.tableHeaderRowElt);
  //   this.tableNodeElts.forEach((nodeElt, i) => {
  //     insertNewElt(this.createTableCell(newColumn, { nodeIndex: i }), nodeElt);
  //   });

  //   // Update frozen context
  //   if (this.options.frozenColumns && newColumnIndex <= this.options.frozenColumns) {
  //     if (newColumnIndex < this.options.frozenColumns) {
  //       this.freezeColumns();
  //     } else {
  //       this.updateFirstUnfrozenColumnOffset();
  //     }
  //   }

  //   //
  //   this.updateTableWidth(`${DomUtils.getEltWidth(this.tableBodyElt) + newColumnWidth}px`);
  //   this.updateVisibleNodes();
  // }

  // protected handleDeleteColumn(columnIndex: number): void {
  //   const columnWidth = DomUtils.getEltWidth(this.getTableRowCells(this.tableHeaderRowElt)[columnIndex]);

  //   //
  //   this.columns = this.columns.filter((_, i) => i !== columnIndex);

  //   // Clear frozen context
  //   if (this.options.frozenColumns && columnIndex < this.options.frozenColumns) {
  //     this.updateFirstUnfrozenColumnOffset('');
  //   }

  //   // Adjust 'frozenColumns' option if there are no longer enough columns
  //   this.options.frozenColumns = this.adjustFrozenColumns(this.options.frozenColumns);

  //   // Remove elements
  //   this.getTableRowCells(this.tableHeaderRowElt)[columnIndex].remove();

  //   this.tableNodeElts.forEach((tableNodeElt) => {
  //     this.getTableRowCells(tableNodeElt)[columnIndex].remove();
  //   });

  //   // Update frozen context
  //   if (this.options.frozenColumns && columnIndex <= this.options.frozenColumns) {
  //     if (columnIndex < this.options.frozenColumns) {
  //       this.freezeColumns();
  //     } else {
  //       this.updateFirstUnfrozenColumnOffset();
  //     }
  //   }

  //   //
  //   this.updateTableWidth(`${DomUtils.getEltWidth(this.tableBodyElt) - columnWidth}px`);
  //   this.updateVisibleNodes();
  // }

  // protected init(): void {
  //   this.tableBodyElt = this.createTableBody();
  //   this.tableHeaderElt = this.createTableHeader();
  //   this.tableHeaderRowElt = this.createTableHeaderRow();
  //   this.tableNodeElts = this.createTableNodes();

  //   this.buildTable();

  //   this.hideUnusedTableNodeElts();

  //   this.setInitialWidths();

  //   if (this.options.frozenColumns) {
  //     this.freezeColumns();
  //   }
  // }

  // protected setActiveNodeIndexes(): void {
  //   this.activeNodeIndexes = [];

  //   for (let i = 0, len = this.nodes.length; i < len; i++) {
  //     const node = this.nodes[i];

  //     if (node.isMatching && !node.isHidden) {
  //       this.activeNodeIndexes.push(i);
  //     }
  //   }

  //   this.setVirtualTableHeight();
  // }

  // protected setNodes(nodes: Node<T>[]): void {
  //   this.currentFilter = null;
  //   this.currentSort = null;
  //   this.nodes = nodes;

  //   this.resetColumnSortHandles();

  //   this.updateNodes();
  // }

  // protected updateNodes(options?: { performFiltering?: boolean; performSorting?: boolean }): void {
  //   if (options?.performFiltering != null && options.performFiltering && this.currentFilter) {
  //     this.handleFilter(this.currentFilter.matchFunc);
  //   }
  //   if (options?.performSorting != null && options.performSorting && this.currentSort) {
  //     this.nodes = this.handleSort(this.currentSort.column, this.currentSort.mode, this.currentSort.compareFunc);
  //   }

  //   this.setActiveNodeIndexes();

  //   this.updateVisibleNodes();
  // }

  // protected updateVisibleNodes(): void {
  //   const startIndex = this.computeFirstVisibleNodeIndex();
  //   this.displayVisibleNodes(startIndex);
  //   this.setVisibleNodeIndexes(startIndex);

  //   this.resetTableNodeElts();

  //   this.populateVisibleNodes();

  //   this.hideUnusedTableNodeElts();
  // }

  // // ////////////////////////////////////////////////////////////////////////////

  // private adjustFrozenColumns(frozenColumns: number): number {
  //   return frozenColumns < this.columns.length ? frozenColumns : 0;
  // }

  // private buildTable(): void {
  //   const rootFragment = document.createDocumentFragment();

  //   rootFragment.appendChild(this.tableHeaderElt);
  //   rootFragment.appendChild(this.tableBodyElt);
  //   this.tableHeaderElt.appendChild(this.tableHeaderRowElt);
  //   this.tableNodeElts.forEach((nodeElt) => {
  //     ((this.tableBodyElt.firstElementChild as HTMLElement).firstElementChild as HTMLElement).appendChild(nodeElt);
  //   });

  //   this.setTableBodyHeight();

  //   this.rootElt.appendChild(rootFragment);
  // }

  // private computeFirstVisibleNodeIndex(): number {
  //   const index =
  //     Math.floor(this.tableBodyElt.scrollTop / this.options.nodeHeight) - AbstractTable.VIRTUAL_SCROLL_PADDING;

  //   return Math.max(0, index);
  // }

  // private convertInPixel({ value, unit }: { value: number; unit: ColumnWidthUnit }): number {
  //   switch (unit) {
  //     case '%':
  //       return DomUtils.getEltComputedWidth(this.rootElt) * (value / 100);

  //     default:
  //       return value;
  //   }
  // }

  // private createColumnView(column: Column<T>): ColumnView<T> {
  //   return { id: column.id, sortMode: column.sortMode };
  // }

  // private createTableBody(): HTMLElement {
  //   const elt = DomUtils.createDiv(AbstractTable.BODY_CLS);
  //   elt.appendChild(DomUtils.createDiv()).appendChild(DomUtils.createDiv());

  //   if (this.columns.some((column) => column.isResizable)) {
  //     elt.classList.add('resizable');
  //   }

  //   elt.addEventListener('scroll', () => {
  //     requestAnimationFrame(() => this.onScrollTableBody());
  //   });

  //   return elt;
  // }

  // private createTableHeader(): HTMLElement {
  //   const elt = DomUtils.createDiv(AbstractTable.HEADER_CLS);

  //   if (this.columns.some((column) => column.isResizable)) {
  //     elt.classList.add('resizable');
  //   }

  //   return elt;
  // }

  // private createTableHeaderCell(column: Column<T>, ctx: { columnIndex: number }): HTMLElement {
  //   const elt = DomUtils.createDiv(AbstractTable.CELL_CLS);
  //   elt.appendChild(this.createTableHeaderCellContent(column));
  //   elt.addEventListener('mouseup', (event) => {
  //     this.onClickTableHeaderCell(event, ctx.columnIndex);
  //   });

  //   if (column.classList) {
  //     elt.classList.add(...column.classList);
  //   }
  //   if (column.isSortable) {
  //     const sortAscElt = DomUtils.createDiv(AbstractTable.SORT_ASC_HANDLE_CLS);
  //     sortAscElt.addEventListener('mouseup', (event) => {
  //       this.onSortColumn(event, ctx.columnIndex, 'asc');
  //     });

  //     const sortDescElt = DomUtils.createDiv(AbstractTable.SORT_DESC_HANDLE_CLS);
  //     sortDescElt.addEventListener('mouseup', (event) => {
  //       this.onSortColumn(event, ctx.columnIndex, 'desc');
  //     });

  //     elt.classList.add('sortable');
  //     elt.appendChild(sortAscElt);
  //     elt.appendChild(sortDescElt);
  //   }
  //   if (column.isResizable) {
  //     const resizeHandleElt = DomUtils.createDiv(AbstractTable.RESIZE_HANDLE_CLS);
  //     resizeHandleElt.addEventListener('mousedown', (event) => {
  //       this.onResizeColumn(event, ctx.columnIndex);
  //     });

  //     elt.appendChild(resizeHandleElt);
  //   }

  //   return elt;
  // }

  // private createTableHeaderCellContent(column: Column<T>): HTMLElement {
  //   const elt = DomUtils.createDiv(AbstractTable.CELL_CONTENT_CLS, column.align);
  //   elt.textContent = column.title;

  //   return elt;
  // }

  // private createTableHeaderRow(): HTMLElement {
  //   const elt = DomUtils.createDiv(AbstractTable.ROW_CLS);

  //   this.columns.forEach((column, i) => {
  //     elt.appendChild(this.createTableHeaderCell(column, { columnIndex: i }));
  //   });

  //   return elt;
  // }

  // private createTableNode(ctx: { nodeIndex: number }): HTMLElement {
  //   const elt = DomUtils.createDiv(AbstractTable.ROW_CLS);
  //   elt.style.height = `${this.options.nodeHeight}px`;

  //   elt.addEventListener('mouseup', (event) => {
  //     this.onClickNode(event, ctx.nodeIndex);
  //   });

  //   this.columns.forEach((column) => {
  //     elt.appendChild(this.createTableCell(column, ctx));
  //   });

  //   return elt;
  // }

  // private createTableNodes(): HTMLElement[] {
  //   return [...Array(this.virtualNodesCount).keys()].map((_, i) => this.createTableNode({ nodeIndex: i }));
  // }

  // private displayVisibleNodes(startIndex: number): void {
  //   const offsetY = startIndex * this.options.nodeHeight;
  //   ((this.tableBodyElt.firstElementChild as HTMLElement)
  //     .firstElementChild as HTMLElement).style.transform = `translateY(${offsetY}px)`;
  // }

  // private freezeColumns(): void {
  //   const freezeCell = (elt: HTMLElement, offset: number): void => {
  //     elt.classList.add('frozen');
  //     elt.style.left = `${offset}px`;
  //   };

  //   for (let i = 0; i < this.options.frozenColumns; i++) {
  //     let offset = 0;
  //     for (let j = 0; j < i; j++) {
  //       offset += DomUtils.getEltWidth(this.getTableRowCells(this.tableHeaderRowElt)[j]);
  //     }

  //     freezeCell(this.getTableRowCells(this.tableHeaderRowElt)[i], offset);

  //     this.tableNodeElts.forEach((nodeElt) => {
  //       freezeCell(this.getTableRowCells(nodeElt)[i], offset);
  //     });
  //   }

  //   this.updateFirstUnfrozenColumnOffset();
  // }

  // private getColumnSortHandles(headerCellElt: HTMLElement): { sortAscElt: HTMLElement; sortDescElt: HTMLElement } {
  //   const headerCellContentElts = headerCellElt.children;
  //   const sortAscElt = DomUtils.getEltByClassName(headerCellContentElts, AbstractTable.SORT_ASC_HANDLE_CLS);
  //   const sortDescElt = DomUtils.getEltByClassName(headerCellContentElts, AbstractTable.SORT_DESC_HANDLE_CLS);

  //   return { sortAscElt: sortAscElt as HTMLElement, sortDescElt: sortDescElt as HTMLElement };
  // }

  // private handleFilter(matchFunc: (value: T) => boolean): void {
  //   const nodesLength = this.nodes.length;

  //   for (let i = nodesLength - 1; i >= 0; i--) {
  //     const node = this.nodes[i];
  //     node.isMatching = matchFunc(node.value);

  //     if (!node.isMatching && !node.isLeaf) {
  //       let nextnodeIndex = i + 1;

  //       while (nextnodeIndex < nodesLength && this.nodes[nextnodeIndex].level > node.level) {
  //         if (this.nodes[nextnodeIndex].isMatching) {
  //           node.isMatching = true;
  //           break;
  //         }
  //         nextnodeIndex++;
  //       }
  //     }
  //   }
  // }

  // private handleSort(column: Column<T>, mode: ColumnSortMode, compareFunc: (a: T, b: T) => number): Node<T>[] {
  //   const compareWithOrderFunc = (a: T, b: T): number => compareFunc(a, b) * (mode === 'desc' ? -1 : 1);
  //   const nodesLength = this.nodes.length;
  //   const rootNodes = [];
  //   const sortedChildrenByParentNodeId = new Map<number, Node<T>[]>();

  //   this.resetColumnSortHandles();

  //   for (let i = 0; i < nodesLength; i++) {
  //     const node = this.nodes[i];
  //     const children = [];
  //     let nextnodeIndex = i + 1;

  //     while (nextnodeIndex < nodesLength && this.nodes[nextnodeIndex].level > node.level) {
  //       if (this.nodes[nextnodeIndex].level === node.level + 1) {
  //         children.push(this.nodes[nextnodeIndex]);
  //       }
  //       nextnodeIndex++;
  //     }

  //     sortedChildrenByParentNodeId.set(
  //       node.id,
  //       children.sort((a, b) => compareWithOrderFunc(a.value, b.value) * -1)
  //     );

  //     if (node.level === 0) {
  //       rootNodes.push(node);
  //     }
  //   }

  //   const sortedNodes = [];
  //   const stack = rootNodes.sort((a, b) => compareWithOrderFunc(a.value, b.value) * -1);

  //   while (stack.length > 0) {
  //     const node = stack.pop() as Node<T>;

  //     sortedNodes.push(node);
  //     Array.prototype.push.apply(stack, sortedChildrenByParentNodeId.get(node.id) as Node<T>[]);
  //   }

  //   this.setColumnSortMode(column, mode);

  //   return sortedNodes;
  // }

  // private hideUnusedTableNodeElts(): void {
  //   for (let i = this.visibleNodeIndexes.length, len = this.tableNodeElts.length; i < len; i++) {
  //     this.tableNodeElts[i].classList.add('hidden');
  //   }
  // }

  // private populateCellContent(cellElt: HTMLElement, fragment: DocumentFragment): void {
  //   const cellContentElt = cellElt.lastElementChild as HTMLElement;

  //   if (fragment.childElementCount > 0) {
  //     cellContentElt.innerHTML = '';
  //     cellContentElt.appendChild(fragment);
  //   } else {
  //     cellContentElt.textContent = fragment.textContent;
  //   }
  // }

  // private populateVisibleNodes(): void {
  //   const columnsLength = this.columns.length;
  //   const defaultCellColor = { backgroundColor: '', color: '' };

  //   for (let i = 0, len = this.visibleNodeIndexes.length; i < len; i++) {
  //     const node = this.nodes[this.visibleNodeIndexes[i]];
  //     const nodeElt = this.tableNodeElts[i];
  //     const cellElts = this.getTableRowCells(nodeElt);
  //     const rowColor = this.options.rowColor?.(node.value);

  //     for (let j = 0; j < columnsLength; j++) {
  //       const cellElt = cellElts[j];
  //       const column = this.columns[j];

  //       this.populateCellContent(cellElt, column.formatter(node.value));

  //       // Update cell color
  //       const cellColor = column.cellColor?.(node.value) ?? rowColor ?? defaultCellColor;
  //       cellElt.style.backgroundColor = cellColor.backgroundColor ?? cellElt.style.backgroundColor;
  //       cellElt.style.color = cellColor.color ?? cellElt.style.color;
  //     }

  //     // Mark selection
  //     if (node.isSelected) {
  //       nodeElt.classList.add('selected');
  //     }
  //   }
  // }

  // private resetColumnSortHandles(): void {
  //   for (let i = 0, len = this.columns.length; i < len; i++) {
  //     if (this.columns[i].isSortable) {
  //       const headerCellElt = this.getTableRowCells(this.tableHeaderRowElt)[i];
  //       const { sortAscElt, sortDescElt } = this.getColumnSortHandles(headerCellElt);
  //       sortAscElt.classList.remove('active');
  //       sortDescElt.classList.remove('active');
  //     }
  //   }
  // }

  // private resetTableNodeElts(): void {
  //   for (let i = 0, len = this.tableNodeElts.length; i < len; i++) {
  //     this.tableNodeElts[i].classList.remove('hidden', 'selected');
  //   }
  // }

  // private setColumnSortMode(targetColumn: Column<T>, sortMode: ColumnSortMode): void {
  //   const targetColumnIndex = this.columns.findIndex((column) => column.id === targetColumn.id);
  //   const headerCellElt = this.getTableRowCells(this.tableHeaderRowElt)[targetColumnIndex];
  //   const { sortAscElt, sortDescElt } = this.getColumnSortHandles(headerCellElt);

  //   targetColumn.sortMode = sortMode;

  //   if (sortMode === 'asc') {
  //     sortAscElt.classList.add('active');
  //   } else if (sortMode === 'desc') {
  //     sortDescElt.classList.add('active');
  //   }
  // }

  // private setInitialWidths(): void {
  //   let columnsWidth = 0;

  //   // Set widths from columns definition
  //   this.columns.forEach((column, i) => {
  //     if (column.width != null) {
  //       const columnWidth = this.convertInPixel(column.width);
  //       const formattedColumnWidth = `${columnWidth}px`;

  //       this.getTableRowCells(this.tableHeaderRowElt)[i].style.width = formattedColumnWidth;
  //       this.updateTableBodyColumnWidth(i, formattedColumnWidth);

  //       columnsWidth += columnWidth;
  //     }
  //   });

  //   // Distribute available width to other columns
  //   const rootEltWidth = DomUtils.getEltComputedWidth(this.rootElt);
  //   const availableWidth = rootEltWidth - columnsWidth;

  //   if (availableWidth > 0) {
  //     const columnWidth = availableWidth / this.columns.filter((column) => !column.width).length;
  //     const formattedColumnWidth = `${columnWidth}px`;

  //     for (let i = 0, len = this.columns.length; i < len; i++) {
  //       const elt = this.getTableRowCells(this.tableHeaderRowElt)[i];

  //       if (!elt.style.width) {
  //         elt.style.width = formattedColumnWidth;

  //         this.tableNodeElts.forEach((nodeElt) => {
  //           this.getTableRowCells(nodeElt)[i].style.width = formattedColumnWidth;
  //         });

  //         columnsWidth += columnWidth;
  //       }
  //     }
  //   }

  //   //
  //   this.updateTableWidth(`${columnsWidth}px`);
  // }

  // private setTableBodyHeight(): void {
  //   this.tableBodyElt.style.maxHeight = `${this.options.visibleNodes * this.options.nodeHeight}px`;
  // }

  // private setVirtualTableHeight(): void {
  //   const height = this.activeNodeIndexes.length * this.options.nodeHeight;
  //   (this.tableBodyElt.firstElementChild as HTMLElement).style.minHeight = `${height}px`;
  // }

  // private setVisibleNodeIndexes(startIndex: number): void {
  //   this.visibleNodeIndexes = this.activeNodeIndexes.slice(startIndex, startIndex + this.virtualNodesCount);
  // }

  // private toggleNodesSelection(nodeIds: number[], isSelected: boolean): void {
  //   (nodeIds.length > 0
  //     ? (nodeIds.map((nodeId) => this.nodes.find((node) => node.id === nodeId)).filter((node) => node) as Node<T>[])
  //     : this.nodes
  //   ).forEach((node) => {
  //     node.isSelected = isSelected;
  //   });
  // }

  // private updateFirstUnfrozenColumnOffset(offset?: string): void {
  //   const tableHeaderRowCells = this.getTableRowCells(this.tableHeaderRowElt);

  //   let formattedWidth;
  //   if (offset != null) {
  //     formattedWidth = offset;
  //   } else {
  //     let frozenColumnsWidth = 0;
  //     for (let i = 0; i < this.options.frozenColumns; i++) {
  //       frozenColumnsWidth += DomUtils.getEltWidth(tableHeaderRowCells[i]);
  //     }
  //     formattedWidth = `${frozenColumnsWidth}px`;
  //   }

  //   tableHeaderRowCells[this.options.frozenColumns].style.paddingLeft = formattedWidth;

  //   for (let i = 0, len = this.tableNodeElts.length; i < len; i++) {
  //     this.getTableRowCells(this.tableNodeElts[i])[this.options.frozenColumns].style.paddingLeft = formattedWidth;
  //   }
  // }

  // private updateFrozenColumnPosition(): void {
  //   const tableHeaderRowCells = this.getTableRowCells(this.tableHeaderRowElt);

  //   for (let i = 0; i < this.options.frozenColumns; i++) {
  //     let offset = 0;
  //     for (let j = 0; j < i; j++) {
  //       offset += DomUtils.getEltWidth(tableHeaderRowCells[j]);
  //     }

  //     const formattedOffset = `${this.tableHeaderElt.scrollLeft + offset}px`;

  //     tableHeaderRowCells[i].style.left = formattedOffset;

  //     for (let j = 0, len = this.tableNodeElts.length; j < len; j++) {
  //       this.getTableRowCells(this.tableNodeElts[j])[i].style.left = formattedOffset;
  //     }
  //   }
  // }

  // private updateTableBodyColumnWidth(columnIndex: number, width: string): void {
  //   for (let i = 0, len = this.tableNodeElts.length; i < len; i++) {
  //     this.getTableRowCells(this.tableNodeElts[i])[columnIndex].style.width = width;
  //   }
  // }

  // private updateTableWidth(formattedWidth: string): void {
  //   this.tableHeaderRowElt.style.width = formattedWidth;
  //   this.tableBodyElt.style.width = formattedWidth;
  //   (this.tableBodyElt.firstElementChild as HTMLElement).style.width = formattedWidth;
  // }

  // // ////////////////////////////////////////////////////////////////////////////

  private onClickNode(event: Event, nodeIndex: number): void {
    // this.dispatchEventClickNode(event, this.nodes[this.visibleNodeIndexes[nodeIndex]]);
  }

  private onClickTableHeaderCell(event: Event, columnIndex: number): void {
    // const eventElt = event.target as HTMLElement;
    // if (
    //   !eventElt.classList.contains(AbstractTable.RESIZE_HANDLE_CLS) &&
    //   !eventElt.classList.contains(AbstractTable.SORT_ASC_HANDLE_CLS) &&
    //   !eventElt.classList.contains(AbstractTable.SORT_DESC_HANDLE_CLS)
    // ) {
    //   this.dispatchEventClickTableHeaderCell(event, this.columns[columnIndex]);
    // }
  }

  private onResizeColumn(startEvent: MouseEvent, columnIndex: number): void {
    const headerCellElt = this.getTableRowCellElts(this.tableHeaderRowElt)[columnIndex];
    // const isFrozenColumn = columnIndex < this.options.frozenColumns;
    const originalColumnWidth = DomUtils.getComputedWidth(headerCellElt);
    const originalPageX = startEvent.pageX;
    // const originalTableWidth = DomUtils.getComputedWidth(this.tableBodyElt.firstElementChild as HTMLElement);

    let eventPageX: number;
    let isTicking = false;

    const updateColumnSize = (): void => {
      isTicking = false;

      const columnWidth = Math.max(this.options.columnMinWidth, originalColumnWidth + (eventPageX - originalPageX));
      // const formattedColumnWidth = `${columnWidth}px`;
      // const formattedTableWidth = `${originalTableWidth - originalColumnWidth + columnWidth}px`;

      // this.tableHeaderRowElt.style.width = formattedTableWidth;
      // this.tableBodyRowElts.forEach((elt) => (elt.style.width = formattedTableWidth));

      this.setTableColumnWidth(columnIndex, columnWidth);

      // Table width
      // this.updateTableWidth(formattedTableWidth);

      // Header cell width
      // headerCellElt.style.width = formattedColumnWidth;

      // Body cells width
      // this.updateTableBodyColumnWidth(columnIndex, formattedColumnWidth);

      // if (this.options.frozenColumns) {
      //   this.updateFrozenColumnPosition();

      //   if (isFrozenColumn) {
      //     this.updateFirstUnfrozenColumnOffset();
      //   }
      // }
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

      window.removeEventListener('mouseup', stopResize, { capture: true });
      window.removeEventListener('mousemove', resize);
    };

    startEvent.preventDefault();

    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResize, { capture: true });
  }

  // private onScrollTableBody(): void {
  //   // Horizontal scroll
  //   if (this.tableBodyElt.scrollLeft !== this.currentScrollX) {
  //     this.currentScrollX = this.tableBodyElt.scrollLeft;

  //     this.tableHeaderElt.scrollLeft = this.tableBodyElt.scrollLeft;

  //     if (this.options.frozenColumns) {
  //       this.updateFrozenColumnPosition();
  //     }
  //   }

  //   // Vertical scroll
  //   if (this.tableBodyElt.scrollTop !== this.currentScrollY) {
  //     this.currentScrollY = this.tableBodyElt.scrollTop;

  //     this.updateVisibleNodes();
  //   }
  // }

  private onSortColumn(event: Event, columnIndex: number, newSortMode: ColumnSortMode): void {
    // this.dispatchEventSortColumn(event, this.columns[columnIndex], newSortMode);
  }

  // // ////////////////////////////////////////////////////////////////////////////

  // private dispatchEventClickTableHeaderCell(originalEvent: Event, column: Column<T>): void {
  //   const columnView = this.createColumnView(column);
  //   const event = DomUtils.createEvent('onClickTableHeaderCell', { event: originalEvent, column: columnView });
  //   this.rootElt.dispatchEvent(event);
  // }

  // private dispatchEventSortColumn(originalEvent: Event, column: Column<T>, newSortMode: ColumnSortMode): void {
  //   const columnView = this.createColumnView(column);
  //   const event = DomUtils.createEvent('onSortColumn', { event: originalEvent, column: columnView, newSortMode });
  //   this.rootElt.dispatchEvent(event);
  // }
}
