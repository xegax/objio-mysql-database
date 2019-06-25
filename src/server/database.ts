import {
  CreateTableArgs,
  DeleteTableArgs,
  PushDataArgs,
  PushDataResult,
  LoadTableDataArgs,
  LoadTableGuidArgs,
  DeleteDataArgs,
  LoadAggrDataArgs,
  TableDesc,
  TableDescShort,
  LoadTableGuidResult,
  CompoundCond,
  ValueCond,
  UpdateDataArgs,
  AggregationFunc,
  LoadAggrDataResult,
  LoadTableDataResult,
  CreateTempTableArgs,
  TableArgs
} from 'objio-object/base/database/database-decl';
import { DatabaseBase } from '../base/database';
import {
  loadTableList,
  loadTableInfo,
  loadRowsNum,
  insert,
  all,
  exec,
  createTable,
  deleteTable,
  loadDatabaseList,
  deleteData,
  get,
  deleteDatabase,
  createDatabase
} from './mysql';
import { Connection } from './connection';
import { StrMap, IDArgs } from 'objio-object/common/interfaces';

function sqlColumn(column: string) {
  return column;
}

function sqlTable(table: string) {
  return table;
}

function aggConv(agg: AggregationFunc, column: string) {
  return `${agg}(${column})`;
}

export function getCompoundSQLCond(cond: CompoundCond, col?: string): string {
  let sql = '';
  if (cond.values.length == 1) {
    sql = getSQLCond(cond.values[0]);
  } else {
    sql = cond.values.map(cond => {
      return `( ${getSQLCond(cond)} )`;
    }).join(` ${cond.op} `);
  }

  if (cond.table && col)
    sql = `select ${col} from ${cond.table} where ${sql}`;

  return sql;
}

export function getSQLCond(cond: ValueCond | CompoundCond): string {
  const comp = cond as CompoundCond;

  if (comp.op && comp.values)
    return getCompoundSQLCond(comp);

  const valueCond = cond as ValueCond;

  if (Array.isArray(valueCond.value) && valueCond.value.length == 2) {
    return `${valueCond.column} >= ${valueCond.value[0]} and ${valueCond.column} <= ${valueCond.value[1]}`;
  } else if (typeof valueCond.value == 'object') {
    const val = valueCond.value as CompoundCond;
    return `${valueCond.column} in (select ${valueCond.column} from ${val.table} where ${getCompoundSQLCond(val)})`;
  }

  let value = valueCond.value;
  let op: string;
  if (valueCond.like) {
    op = valueCond.inverse ? ' not like ' : ' like ';
    if (value.indexOf('%') == -1 && value.indexOf('_') == -1)
      value = '%' + value + '%';
  } else if (value == '' || value == null) {
    op = valueCond.inverse ? 'is not' : 'is';
    return `${valueCond.column} ${op} NULL`;
  } else {
    op = valueCond.inverse ? '!=' : '=';
  }

  return `${valueCond.column}${op}"${value}"`;
}

export class Database extends DatabaseBase {
  constructor() {
    super();

    this.holder.setMethodsToInvoke({
      loadTableList: {
        method: () => this.loadTableList(),
        rights: 'read'
      },
      loadTableRowsNum: {
        method: (args: TableArgs) => this.loadTableRowsNum(args),
        rights: 'read'
      },
      loadTableData: {
        method: (args: LoadTableDataArgs) => this.loadTableData(args),
        rights: 'read'
      },
      createTable: {
        method: (args: CreateTableArgs) => this.createTable(args),
        rights: 'create'
      },
      deleteTable: {
        method: (args: DeleteTableArgs) => this.deleteTable(args),
        rights: 'write'
      },
      pushData: {
        method: (args: PushDataArgs) => this.pushData(args),
        rights: 'write'
      },
      deleteData: {
        method: (args: DeleteDataArgs) => this.deleteData(args),
        rights: 'write'
      },
      loadAggrData: {
        method: (args: LoadAggrDataArgs) => this.loadAggrData(args),
        rights: 'read'
      },
      setConnection: {
        method: (args: IDArgs) => this.setConnection(args),
        rights: 'write'
      },
      getDatabaseList: {
        method: () => this.loadDatabaseList(),
        rights: 'read'
      },
      setDatabase: {
        method: (args: { database: string }) => this.setDatabase(args.database),
        rights: 'write'
      },
      createDatabase: {
        method: (args: { database: string }) => this.createDatabase(args.database),
        rights: 'write'
      },
      deleteDatabase: {
        method: (args: { database: string }) => this.deleteDatabase(args.database),
        rights: 'write'
      }
    });
  }

  getConnClasses() {
    return [ Connection ];
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

  createDatabase(database: string): Promise<void> {
    return (
      createDatabase(this.getConnRef(), database)
      .then(() => {
        this.holder.save(true);
      })
    );
  }

  deleteDatabase(db: string) {
    return (
      deleteDatabase(this.getConnRef(), db)
      .then(() => {
        this.holder.save(true);
      })
    );
  }

  loadDatabaseList() {
    if (!this.conn)
      return Promise.reject('Connection is not selected');

    return loadDatabaseList(this.getConnRef());
  }

  loadTableList(): Promise<Array<TableDesc>> {
    return (
      loadTableList(this.getConnRef(), this.database)
      .then(arr => {
        const list = Promise.all(arr.map(table => loadTableInfo(this.getConnRef(), this.database, table)));
        return list.map((table, i) => {
          return {
            table: arr[i],
            columns: table.map(c => ({ colName: c.name, colType: c.type })),
            rowsNum: 0
          };
        });
      })
      .then(list => Promise.all(list.map(t => {
        return (
          loadRowsNum(this.getConnRef(), this.database, t.table)
          .then(num => {
            t.rowsNum = num;
            return t;
          })
        );
      })))
    );
  }

  loadTableRowsNum(args: TableArgs): Promise<number> {
    return loadRowsNum(this.getConnRef(), this.database, args.table);
  }

  loadTableData(args: LoadTableDataArgs): Promise<LoadTableDataResult> {
    const where = '';
    const sql = `select * from ${this.database}.${args.table} ${where} limit ? offset ?`;
    return (
      all<Object>(this.getConnRef(), sql, [args.count, args.from])
      .then((rows: Array<StrMap>) => {
        return {
          rows,
          fromRow: args.from,
          rowsNum: args.count
        };
      })
    );
  }

  createTempTable(args: CreateTempTableArgs): Promise<TableDescShort> {
    let cols = '*';
    if (args.columns && args.columns.length)
      cols = args.columns.join(', ');

    const tmpTable = args.tmpTableName;
    const table = args.table;
    const where = args.cond ? 'where ' + getCompoundSQLCond(args.cond) : '';
    const groupBy = '';
    const orderBy = args.order && args.order.length ? 'order by ' + args.order.map(c => `${c.column} ${c.reverse ? 'desc' : 'asc'}`).join(', ') : '';
    let sql = `use ${this.database};`;
    sql += `create temporary table ${tmpTable} as select ${cols} from ${table} ${where} ${groupBy} ${orderBy}`;

    console.log(sql);
    return (
      deleteTable(this.getConnRef(), this.database, tmpTable)
      .then(() => exec(this.getConnRef(), sql))
      .then(() => Promise.all([
          loadTableInfo(this.getConnRef(), this.database, tmpTable),
          loadRowsNum(this.getConnRef(), this.database, tmpTable)
        ])
      )
      .then(arr => {
        return {
          columns: arr[0].map(c => ({ colName: c.name, colType: c.type })),
          rowsNum: arr[1]
        };
      })
    );
  }

  createTable(args: CreateTableArgs): Promise<TableDesc> {
    return (
      createTable(
        this.getConnRef(),
        this.database,
        args.table,
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
      deleteTable(this.getConnRef(), this.database, args.table)
    );
  }

  deleteData(args: DeleteDataArgs): Promise<void> {
    return (
      deleteData({
        conn: this.getConnRef(),
        db: this.database,
        table: args.table,
        where: getCompoundSQLCond(args.cond)
      })
    );
  }

  loadAggrData(args: LoadAggrDataArgs): Promise<LoadAggrDataResult> {
    let sqlArr = args.values.map((v, i) => aggConv(v.aggs, v.column) + ` as col${i}`);
    return (
      get(this.getConnRef(), `select ${sqlArr.join(', ')} from ${this.database}.${args.table}`)
      .then(res => {
        return {
          values: args.values.map((v, i) => {
            return {
              column: v.column,
              aggs: v.aggs,
              value: res['col' + i]
            };
          })
        };
      })
    );
  }

  pushData(args: PushDataArgs): Promise<PushDataResult> {
    return (
      insert({
        conn: this.getConnRef(),
        db: this.database,
        table: args.table,
        values: args.rows
      })
      .then(() => {
        return { pushRows: args.rows.length };
      })
    );
  }

  updateData(args: UpdateDataArgs): Promise<void> {
    const vals = args.values.map(value => `${sqlColumn(value.column)}=?`).join(',');
    const where = args.cond ? 'where ' + getCompoundSQLCond(args.cond) : '';
    // const limit = args.limit != null ? `limit ${args.limit}` : '';
    const sql = `update ${sqlTable(args.table)} set ${vals} ${where}`;
    return (
      all(this.getConnRef(), sql, args.values.map(v => v.value))
      .then(() => {})
    );
  }

  ////////////////////////////////////////////////////////////
}
