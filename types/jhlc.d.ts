// Type stubs for @jhlc/* internal packages
// These are internal dependencies not available in npm registry

declare module "@jhlc/common-core/src/components/table/base-table/type" {
  interface ColumnDesc {
    name?: string;
    label?: string;
    width?: number;
    minWidth?: number;
    align?: string;
    fixed?: string;
    type?: string;
    prop?: string;
    [key: string]: any;
  }
  type TableColumnDesc<T = any> = ColumnDesc & { [K in keyof T]?: T[K] };
  export type { ColumnDesc, TableColumnDesc };
}

declare module "@jhlc/common-core/src/store/business-logic-data" {
  const useBusinessLogicDataStore: () => {
    get(key: any): any[];
    [key: string]: any;
  };
  export default useBusinessLogicDataStore;
}

declare module "@jhlc/types/src/logical-data" {
  export const BusLogicDataType: Record<string, string>;
  export class BusLogicKey {
    constructor(opts: { logicType: string; logicValue: string });
  }
}
