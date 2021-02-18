export class TableUtils {
  public static readonly VENDOR_CLS: string = 'yac-table';
  public static readonly HIDDEN_CLS: string = `${TableUtils.VENDOR_CLS}-hidden`;
  public static readonly RESIZE_HANDLE_CLS: string = `${TableUtils.VENDOR_CLS}-resize-handle`;
  public static readonly SELECTED_CLS: string = `${TableUtils.VENDOR_CLS}-selected`;
  public static readonly SORT_ASC_HANDLE_CLS: string = `${TableUtils.VENDOR_CLS}-sort-asc-handle`;
  public static readonly SORT_DESC_HANDLE_CLS: string = `${TableUtils.VENDOR_CLS}-sort-desc-handle`;
  public static readonly STICKY_CLS: string = `${TableUtils.VENDOR_CLS}-sticky`;
  public static readonly TABLE_BODY_CLS: string = `${TableUtils.VENDOR_CLS}-body`;
  public static readonly TABLE_CELL_CLS: string = `${TableUtils.VENDOR_CLS}-cell`;
  public static readonly TABLE_CELL_CONTENT_CLS: string = `${TableUtils.VENDOR_CLS}-cell-content`;
  public static readonly TABLE_CLS: string = TableUtils.VENDOR_CLS;
  public static readonly TABLE_HEADER_CLS: string = `${TableUtils.VENDOR_CLS}-header`;
  public static readonly TABLE_ROW_CLS: string = `${TableUtils.VENDOR_CLS}-row`;
  public static readonly VIRTUAL_SCROLL_SPACER_CLS: string = `${TableUtils.VENDOR_CLS}-virtual-scroll-spacer`;

  public static getTextAlignmentCls(alignment: string): string {
    return `${TableUtils.VENDOR_CLS}-text-${alignment}`;
  }
}
