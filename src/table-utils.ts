export type ColumnWidthUnit = 'px' | '%';

export type SortOrder = 'asc' | 'default' | 'desc';

export class TableUtils {
  public static readonly VENDOR_CLS: string = 'yac-table';
  public static readonly ACTIVE_CLS: string = `${TableUtils.VENDOR_CLS}-active`;
  public static readonly EXPAND_TOGGLER_CLS: string = `${TableUtils.VENDOR_CLS}-expand-toggler`;
  public static readonly HIDDEN_CLS: string = `${TableUtils.VENDOR_CLS}-hidden`;
  public static readonly RESIZE_HANDLE_CLS: string = `${TableUtils.VENDOR_CLS}-resize-handle`;
  public static readonly SELECTABLE_CLS: string = `${TableUtils.VENDOR_CLS}-selectable`;
  public static readonly SELECTED_CLS: string = `${TableUtils.VENDOR_CLS}-selected`;
  public static readonly SORT_ASC_HANDLE_CLS: string = `${TableUtils.VENDOR_CLS}-sort-asc-handle`;
  public static readonly SORT_DESC_HANDLE_CLS: string = `${TableUtils.VENDOR_CLS}-sort-desc-handle`;
  public static readonly SORTABLE_CLS: string = `${TableUtils.VENDOR_CLS}-sortable`;
  public static readonly STICKY_CLS: string = `${TableUtils.VENDOR_CLS}-sticky`;
  public static readonly TABLE_BODY_CLS: string = `${TableUtils.VENDOR_CLS}-body`;
  public static readonly TABLE_CELL_CHECK_CLS: string = `${TableUtils.VENDOR_CLS}-cell-check`;
  public static readonly TABLE_CELL_CLS: string = `${TableUtils.VENDOR_CLS}-cell`;
  public static readonly TABLE_CELL_CONTENT_CLS: string = `${TableUtils.VENDOR_CLS}-cell-content`;
  public static readonly TABLE_CLS: string = TableUtils.VENDOR_CLS;
  public static readonly TABLE_HEADER_CLS: string = `${TableUtils.VENDOR_CLS}-header`;
  public static readonly TABLE_ROW_ACTIONS_CLS: string = `${TableUtils.VENDOR_CLS}-row-actions`;
  public static readonly TABLE_ROW_ACTIONS_HANDLE_CLS: string = `${TableUtils.VENDOR_CLS}-row-actions-handle`;
  public static readonly TABLE_ROW_CLS: string = `${TableUtils.VENDOR_CLS}-row`;
  public static readonly VIRTUAL_SCROLL_SPACER_CLS: string = `${TableUtils.VENDOR_CLS}-virtual-scroll-spacer`;

  public static getTextAlignmentCls(alignment: string): string {
    return `${TableUtils.VENDOR_CLS}-text-${alignment}`;
  }

  public static getEllipsisIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M8 12a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0-6a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0-6a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" fill="currentColor"></path></svg>`;
  }

  public static getTickIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <g>
        <path d="M0 7a7 7 0 1 1 14 0A7 7 0 0 1 0 7z" fill="currentColor"></path>
        <path d="M13 7A6 6 0 1 0 1 7a6 6 0 0 0 12 0z" fill="#fff"></path>
        <path
          d="M6.278 7.697L5.045 6.464a.296.296 0 0 0-.42-.002l-.613.614a.298.298 0 0 0 .002.42l1.91 1.909a.5.5 0 0 0 .703.005l.265-.265L9.997 6.04a.291.291 0 0 0-.009-.408l-.614-.614a.29.29 0 0 0-.408-.009L6.278 7.697z"
          fill="currentColor"
        ></path>
      </g>
    </svg>`;
  }
}
