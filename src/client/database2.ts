import {
  TmpTableArgs,
  TableInfo,
  TableArgs,
  TableData,
  TableDataArgs,
  CreateTableArgs,
  DeleteTableArgs,
  PushDataArgs,
  PushDataResult
} from 'objio-object/base/database-holder';
import { DatabaseBase } from '../base/database2';
import { IDArgs } from 'objio-object/common/interfaces';
import { Connection } from './connection';

export class Database2 extends DatabaseBase {
  getConnClasses() {
    return [ Connection ];
  }

  loadTableList(): Promise<Array<TableInfo>> {
    return this.holder.invokeMethod({ method: 'loadTableList', args: {} });
  }

  loadTableInfo(args: TableArgs): Promise<TableInfo> {
    return this.holder.invokeMethod({ method: 'loadTableInfo', args });
  }

  loadTableRowsNum(args: TableArgs): Promise<number> {
    return this.holder.invokeMethod({ method: 'loadTableRowsNum', args });
  }

  loadTableData(args: TableDataArgs): Promise<TableData> {
    return this.holder.invokeMethod({ method: 'loadTableData', args });
  }

  createTempTable(args: TmpTableArgs): Promise<TableInfo> {
    return this.holder.invokeMethod({ method: 'createTempTable', args });
  }

  createTable(args: CreateTableArgs): Promise<TableInfo> {
    return this.holder.invokeMethod({ method: 'createTable', args });
  }

  deleteTable(args: DeleteTableArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'deleteTable', args });
  }

  pushData(args: PushDataArgs): Promise<PushDataResult> {
    return this.holder.invokeMethod({ method: 'pushData', args });
  }

  setConnection(args: IDArgs): Promise<void> {
    return this.holder.invokeMethod({ method: 'setConnection', args });
  }

  setDatabase(database: string) {
    return this.holder.invokeMethod({ method: 'setDatabase', args: { database } });
  }

  getDatabaseList() {
    return this.holder.invokeMethod({ method: 'getDatabaseList', args: {} });
  }

  isRemote() {
    return true;
  }
}
