import {
  TableInfo,
  TableArgs,
  TmpTableArgs,
  TableData,
  TableDataArgs,
  CreateTableArgs,
  DeleteTableArgs,
  PushDataArgs,
  PushDataResult
} from 'objio-object/base/database-holder';
import { DatabaseBase } from '../base/database2';
import {
  loadTableList,
  loadTableInfo,
  loadRowsNum,
  insert,
  all,
  exec,
  createTable,
  deleteTable,
  loadDatabaseList
} from './mysql';
import { Connection } from './connection';
import { StrMap, IDArgs } from 'objio-object/common/interfaces';

export class Database2 extends DatabaseBase {
  protected database: string;
  private tempTables: { [key: string]: { tableName: string, columns: Array<string> } } = {};
  private tmpTableCounter = 0;

  constructor() {
    super();

    this.holder.setMethodsToInvoke({
      loadTableList: {
        method: () => this.loadTableList(),
        rights: 'read'
      },
      loadTableInfo: {
        method: (args: TableArgs) => this.loadTableInfo(args),
        rights: 'read'
      },
      loadTableRowsNum: {
        method: (args: TableArgs) => this.loadTableRowsNum(args),
        rights: 'read'
      },
      loadTableData: {
        method: (args: TableDataArgs) => this.loadTableData(args),
        rights: 'read'
      },
      createTempTable: {
        method: (args: TableArgs) => this.createTempTable(args),
        rights: 'create'
      },
      createTable: {
        method: (args: CreateTableArgs) => this.createTable(args),
        rights: 'create'
      },
      deleteTable: {
        method: (args: DeleteTableArgs) => this.deleteTable(args),
        rights: 'write'
      },
      setConnection: {
        method: (args: IDArgs) => this.setConnection(args),
        rights: 'write'
      },
      getDatabaseList: {
        method: () => this.getDatabaseList(),
        rights: 'read'
      },
      setDatabase: {
        method: (args: { database: string }) => this.setDatabase(args.database),
        rights: 'write'
      }
    });
  }

  isRemote() {
    return true;
  }

  getConnClasses() {
    return [Connection];
  }

  private getConnRef() {
    return (this.conn as any as Connection).getRef();
  }

  setConnection(args: IDArgs): Promise<void> {
    if (this.conn && this.conn.getID() == args.id)
      return Promise.resolve();

    return (
      this.holder.getObject<Connection>(args.id)
        .then(conn => {
          if (!(conn instanceof Connection))
            return Promise.reject('Connection object is not valid');

          this.conn = conn as any;
          this.holder.save();
        })
    );
  }

  setDatabase(database: string): Promise<void> {
    if (this.database == database)
      return Promise.resolve();

    this.database = database;
    this.holder.save();
    return Promise.resolve();
  }

  getDatabaseList() {
    if (!this.conn)
      return Promise.reject('Connection is not selected');

    return loadDatabaseList(this.getConnRef());
  }

  loadTableList(): Promise<Array<TableInfo>> {
    if (!this.database)
      return Promise.reject('Database is not selected');

    return (
      loadTableList(this.getConnRef(), this.database)
        .then(arr => {
          return Promise.all(
            arr.map(tableName => this.loadTableInfo({ tableName }))
          );
        })
    );
  }

  loadTableInfo(args: TableArgs): Promise<TableInfo> {
    const conn = this.getConnRef();
    return (
      Promise.all([
        loadTableInfo(conn, this.database, args.tableName),
        loadRowsNum(conn, this.database, args.tableName)
      ])
        .then(arr => {
          const res: TableInfo = {
            tableName: args.tableName,
            columns: arr[0].map(c => ({ colName: c.name, colType: c.type })),
            rowsNum: arr[1]
          };
          return res;
        })
    );
  }

  loadTableRowsNum(args: TableArgs): Promise<number> {
    return (
      loadRowsNum(this.getConnRef(), this.database, args.tableName)
    );
  }

  loadTableData(args: TableDataArgs): Promise<TableData> {
    const { tableName, fromRow, rowsNum } = args;
    const where = '';
    const sql = `select * from ${this.database}.${tableName} ${where} limit ? offset ?`;
    return (
      all<Object>(this.getConnRef(), sql, [rowsNum, fromRow])
        .then((rows: Array<StrMap>) => {
          return {
            rows,
            fromRow,
            rowsNum
          };
        })
    );
  }

  getTempTableKey(args: TmpTableArgs): string {
    const keyObj: { n: string, cn?: number, cols?: Array<string> } = {
      n: args.tableName
    };

    if (args.columns) {
      keyObj.cn = args.columns.length;
      keyObj.cols = args.columns;
    }

    return JSON.stringify(keyObj);
  }

  createTempTable(args: TmpTableArgs): Promise<TableInfo> {
    const key = this.getTempTableKey(args);
    const table = this.tempTables[key];
    if (table)
      return this.loadTableInfo({ tableName: table.tableName });

    this.tmpTableCounter++;
    const where = '';
    const groupBy = '';
    const orderBy = '';
    const cols = args.columns ? args.columns.join(', ') : '*';
    const tmpTableName = `tmp_table_${this.tmpTableCounter}`;
    const sql = `use ${this.database}; create temporary table ${tmpTableName} as select ${cols} from ${args.tableName} ${where} ${groupBy} ${orderBy}`.trim();
    const conn = this.getConnRef();
    return (
      // exec(conn, `use ${this.database}`)
      Promise.resolve()
      .then(() => {
        return (
          exec(conn, sql)
          .then(() => {
            this.tempTables[key] = {
              tableName: tmpTableName,
              columns: args.columns
            };

            return this.loadTableInfo({ tableName: tmpTableName });
          })
        );
      })
    );
  }

  createTable(args: CreateTableArgs): Promise<TableInfo> {
    return (
      createTable(
        this.getConnRef(),
        this.database,
        args.tableName,
        args.columns.map(col => {
          return {
            name: col.colName,
            type: col.colType,
            ...col
          };
        })
      )
    );
  }

  deleteTable(args: DeleteTableArgs): Promise<void> {
    return (
      deleteTable(this.getConnRef(), this.database, args.tableName)
    );
  }

  pushData(args: PushDataArgs): Promise<PushDataResult> {
    return (
      insert({
        conn: this.getConnRef(),
        db: this.database,
        table: args.tableName,
        values: args.rows
      })
      .then(pushRows => ({ pushRows }))
    );
  }

  ////////////////////////////////////////////////////////////
}
