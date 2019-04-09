import { DatabaseBase } from '../base/database';
import {
  TableNameArgs,
  TableColsArgs,
  ColumnAttr,
  Columns,
  NumStatsArgs,
  NumStats,
  LoadCellsArgs,
  PushRowArgs,
  Cells,
  SubtableAttrs,
  CreateSubtableResult
} from 'objio-object/base/database/table';
import { SERIALIZER } from 'objio';
import { Connection } from './connection';
import { TableInfo } from '../base/database';
import {
  exec,
  all,
  get,
  insert,
  createTable,
  loadTableInfo,
  getSqlCondition,
  deleteTable
} from './mysql';
import * as mysql from 'mysql';

let subtableCounter: number = 0;
export class Database extends DatabaseBase {
  private db: mysql.Connection;
  private subtableMap: {[key: string]: { subtable: string, columns: Array<ColumnAttr> }} = {};
  protected connection: Connection;

  constructor() {
    super();

    this.holder.addEventHandler({
      onCreate: () => {
        console.log('mysql db create');
        return (
          this.openDB(false)
          .then(() => exec(this.db, `create database if not exists ${this.database}`))
          .then(() => exec(this.db, `use ${this.database}`))
          .then(() => this.updateTables())
        );
      },
      onLoad: () => {
        console.log('mysql db load');
        return (
          this.openDB()
          .then(() => this.updateTables())
        );
      }
    });

    this.holder.setMethodsToInvoke({
      loadTableInfo: {
        method: (args: TableNameArgs) => {
          return this.loadTableInfo(args);
        },
        rights: 'read'
      },
      loadRowsCount: {
        method: (args: TableNameArgs) => {
          return this.loadRowsCount(args);
        },
        rights: 'read'
      },
      deleteTable: {
        method: (args: TableNameArgs) => {
          return this.deleteTable(args);
        },
        rights: 'write'
      },
      createTable: {
        method: (args: TableColsArgs) => {
          return this.createTable(args);
        },
        rights: 'write'
      },
      loadCells: {
        method: (args: LoadCellsArgs) => {
          return this.loadCells(args);
        },
        rights: 'read'
      },
      getNumStats: {
        method: (args: NumStatsArgs) => {
          return this.getNumStats(args);
        },
        rights: 'read'
      },
      createSubtable: {
        method: (args: SubtableAttrs & { table: string }) => {
          return this.createSubtable(args);
        },
        rights: 'read'
      },
      pushCells: {
        method: (args: PushRowArgs & {table: string}) => {
          return this.pushCells(args);
        },
        rights: 'write'
      }
    });
  }

  updateTables(): Promise<boolean> {
    return (
      this.openDB()
      .then(() => {
        return (
          all(this.db, 'show tables')
          .then(tables => {
            const arr: Array<TableInfo> = tables.map(table => {
              return { name: table[Object.keys(table)[0]] };
            });

            if (JSON.stringify(arr) == JSON.stringify(this.tables))
              return false;

            this.tables = arr;
            this.holder.save();

            return true;
          })
        );
      })
    );
  }

  loadTableInfo(args: TableNameArgs): Promise<Array<ColumnAttr>> {
    return (
      this.openDB()
      .then(() => loadTableInfo(this.db, this.database, args.table))
    );
  }

  openDB(useDB: boolean = true): Promise<mysql.Connection> {
    this.db = this.connection.getRef();
    if (useDB)
      return exec(this.db, `use ${this.database}`).then(() => this.db);

    return Promise.resolve(this.db);
  }

  createTable(args: TableColsArgs): Promise<void> {
    return (
      this.openDB()
      .then(() => createTable(this.db, this.database, args.table, args.columns))
      .then(() => this.updateTables() as Promise<any>)
    );
  }

  deleteTable(args: TableNameArgs): Promise<void> {
    return (
      this.openDB()
      .then(() => deleteTable(this.db, this.database, args.table))
      .then(() => this.updateTables() as Promise<any>)
    );
  }

  loadCells(args: LoadCellsArgs): Promise<Cells> {
    const { table, filter, first, count } = args;
    let where = filter ? getSqlCondition(filter) : '';
    if (where)
      where = `where ${where}`;

    const sql = `select * from ${table} ${where} limit ? offset ?`;
    return (
      this.openDB()
      .then(() => all<Object>(this.db, sql, [count, first]))
      .then(rows => {
        return rows.map(row => Object.keys(row).map(key => row[key]));
      })
    );
  }

  pushCells(args: PushRowArgs & { table: string }): Promise<number> {
    return (
      this.openDB()
      .then(() => insert({...args, conn: this.db, db: this.database}))
    );
  }

  loadRowsCount(args: TableNameArgs): Promise<number> {
    return (
      this.openDB()
      .then(() => get<{count: number}>(this.db, `select count(*) as count from ${args.table}`))
      .then(res => res.count)
    );
  }

  getNumStats(args: NumStatsArgs): Promise<NumStats> {
    const { table, column } = args;
    const sql = `select min(${column}) as min, max(${column}) as max from ${table} where ${column}!=""`;
    return (
      this.openDB()
      .then(() => get<NumStats>(this.db, sql))
    );
  }

  getColumns(table: string): Promise<Columns> {
    return this.loadTableInfo({ table });
  }

  createSubtable(args: SubtableAttrs & { table: string }): Promise<CreateSubtableResult> {
    return (
      this.loadTableInfo({ table: args.table })
      .then(columns => {
        return this.createSubtableImpl({...args, columns});
      })
    );
  }

  createSubtableImpl(args: SubtableAttrs & { table: string, columns: Columns }): Promise<CreateSubtableResult> {
    let tableKey = JSON.stringify(args);
    const subtable = this.subtableMap[tableKey];
    if (subtable) {
      return (
        this.loadRowsCount({table: subtable.subtable})
        .then(rowsNum => ({
          ...subtable,
          rowsNum
        }))
      );
    }

    let newTable = 'tmp_table_' + subtableCounter++;
    let cols = (args.cols && args.cols.length) ? args.cols.join(', ') : '*';

    let cond: string = null;
    if (typeof args.filter == 'string')
      cond = args.filter;
    else if (args.filter)
      cond = getSqlCondition(args.filter);

    const where = cond ? ` where ${cond}` : '';
    let orderBy: string = '';
    if (args.sort && args.sort.length)
      orderBy = `order by ${args.sort[0].column} ${args.sort[0].dir}`;

    this.subtableMap[tableKey] = {
      subtable: newTable,
      columns: !args.cols || args.cols.length == 0 ? args.columns : args.columns.filter(col => {
        return args.cols.indexOf(col.name) != -1;
      })
    };

    let groupBy = '';
    if (args.distinct) {
      groupBy = `group by ${args.distinct.column}`;
      this.subtableMap[tableKey].columns = [
        { name: args.distinct.column, type: args.columns.find(c => c.name == args.distinct.column).type },
        { name: 'count', type: 'INTEGER' }
      ];
      cols = [args.distinct.column, `count(${args.distinct.column}) as count`].join(', ');
    }

    let sql = `create temporary table ${newTable}`;
    // sql += ' ENGINE=MEMORY ';
    sql += ` as select ${cols} from ${args.table} ${where} ${groupBy} ${orderBy}`;
    console.log(sql);

    return (
      this.openDB()
      .then(() => exec(this.db, sql))
      .then(() => this.loadRowsCount({table: newTable}))
      .then(rowsNum => {
        return { ...this.subtableMap[tableKey], rowsNum };
      })
    );
  }

  static SERIALIZE: SERIALIZER = () => ({
    ...DatabaseBase.SERIALIZE()
  })
}
