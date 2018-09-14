import * as mysql from 'mysql';
import { Database as Base, Table } from '../client/database';
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
  Condition,
  CompoundCond,
  ValueCond,
  SubtableAttrs,
  CreateSubtableResult
} from 'objio-object/client/table';
import { SERIALIZER } from 'objio';
import { Connect } from './connect';

export function getCompSqlCondition(cond: CompoundCond, col?: string): string {
  let sql = '';
  if (cond.values.length == 1) {
    sql = getSqlCondition(cond.values[0]);
  } else {
    sql = cond.values.map(cond => {
      return `( ${getSqlCondition(cond)} )`;
    }).join(` ${cond.op} `);
  }

  if (cond.table && col)
    sql = `select ${col} from ${cond.table} where ${sql}`;

  return sql;
}

function getSqlCondition(cond: Condition): string {
  const comp = cond as CompoundCond;

  if (comp.op && comp.values)
    return getCompSqlCondition(comp);

  const value = cond as ValueCond;

  if (Array.isArray(value.value) && value.value.length == 2) {
    return `${value.column} >= ${value.value[0]} and ${value.column} <= ${value.value[1]}`;
  } else if (typeof value.value == 'object') {
    const val = value.value as CompoundCond;
    return `${value.column} in (select ${value.column} from ${val.table} where ${getCompSqlCondition(val)})`;
  }

  const op = value.inverse ? '!=' : '=';
  return `${value.column}${op}"${value.value}"`;
}

function exec(db: mysql.Connection, sql: string): Promise<any> {
  return new Promise((resolve, reject) => {
    db.query(sql, err => {
      if (!err) {
        resolve();
      } else {
        console.log('error at', sql);
        reject(err);
      }
    });
  });
}

function run(db: mysql.Connection, sql: string, params: Array<any>): Promise<any> {
  return new Promise((resolve, reject) => {
    db.query(sql, params, err => {
      if (!err) {
        resolve();
      } else {
        console.log('error at', sql);
        reject(err);
      }
    });
  });
}

function all<T = Object>(db: mysql.Connection, sql: string, params?: Array<any>): Promise<Array<T>> {
  return new Promise((resolve, reject) => {
    db.query(sql, params || [], (err, rows: Array<T>) => {
      if (err)
        return reject(err);
      resolve(rows);
    });
  });
}

function get<T = Object>(db: mysql.Connection, sql: string): Promise<T> {
  return new Promise((resolve, reject) => {
    db.query(sql, (err, rows: T) => {
      if (err)
        return reject(err);
      resolve(rows[0]);
    });
  });
}

function createTable(db: mysql.Connection, table: string, columns: Columns): Promise<any> {
  const sql = columns.map(column => {
    let value = `${column.name} ${column.type}`;
    if (column.autoInc)
      value += ' AUTO_INCREMENT';

    if (column.unique)
      value += ' UNIQUE';

    if (column.notNull)
      value += ' NOT NULL';

    if (column.primary)
      value += ' PRIMARY KEY';

    return value;
  }).join(', ');
  return exec(db, `create table ${table} (${sql})`);
}

function deleteTable(db: mysql.Connection, table: string): Promise<void> {
  return exec(db, `drop table if exists ${table}`);
}

function loadTableInfo(db: mysql.Connection, table: string): Promise<Columns> {
  return all<ColumnAttr>(db, `describe ${table}`).then(res => {
    return res.map(row => ({name: row['Field'], type: row['Type']}));
  });
}

function insert(db: mysql.Connection, table: string, values: {[col: string]: Array<string>}): Promise<any> {
  const cols = Object.keys(values);

  const rows: Array<string> = [];
  const rowsNum = values[cols[0]].length;
  for (let n = 0;  n < rowsNum; n++) {
    rows.push( '(' + cols.map(col => {
      const value = values[col][n];
      if (!value)
        return 'NULL';
      return mysql.escape(`${value}`);
    } ).join(',') + ')' );
  }

  const sql = `insert into ${table}(${cols.join(',')}) values ${rows.join(',')};`;
  return run(db, sql, []);
}

let subtableCounter: number = 0;
export class Database extends Base {
  private db: mysql.Connection;
  private subtableMap: {[key: string]: { subtable: string, columns: Array<ColumnAttr> }} = {};
  protected connect: Connect;

  constructor() {
    super();

    this.holder.addEventHandler({
      onCreate: () => {
        console.log('mysql db create');
        return this.openDB();
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
      loadTableInfo: this.loadTableInfo,
      loadRowsCount: this.loadRowsCount,
      deleteTable: this.deleteTable,
      createTable: this.createTable,
      loadCells: this.loadCells,
      getNumStats: this.getNumStats,
      createSubtable: this.createSubtable,
      pushCells: this.pushCells
    });
  }

  updateTables(): Promise<boolean> {
    return (
      all(this.db, 'show tables')
      .then(tables => {
        const arr: Array<Table> = tables.map(table => {
          return { name: table[Object.keys(table)[0]] };
        });

        if (JSON.stringify(arr) == JSON.stringify(this.tableInfo))
          return false;

        this.tableInfo = arr;
        this.holder.save();

        return true;
      })
    );
  }

  loadTableInfo = (args: TableNameArgs) => {
    return loadTableInfo(this.db, args.table);
  }

  openDB(): Promise<mysql.Connection> {
    if (this.db)
      return Promise.resolve(this.db);

    return new Promise((resolve, reject) => {
      const cfg: mysql.ConnectionConfig = {
        ...this.connect.getConfig(),
        password: this.connect.getPassword()
      };

      this.db = mysql.createConnection(cfg);
      this.db.connect(err => {
        if (err)
          reject(err);
        else
          resolve(this.db);
      });
    });
  }

  createTable = (args: TableColsArgs): Promise<void> => {
    return (
      createTable(this.db, args.table, args.columns)
      .then(() => this.updateTables())
      .then(() => {})
    );
  }

  deleteTable = (args: TableNameArgs): Promise<void> => {
    return (
      deleteTable(this.db, args.table)
      .then(() => this.updateTables())
      .then(() => {})
    );
  }

  loadCells = (args: LoadCellsArgs): Promise<Cells> => {
    const { table, filter, first, count } = args;
    let where = filter ? getSqlCondition(filter) : '';
    if (where)
      where = `where ${where}`;

    const sql = `select * from ${table} ${where} limit ? offset ?`;
    return (
      all<Object>(this.db, sql, [count, first])
      .then(rows => {
        return rows.map(row => Object.keys(row).map(key => row[key]));
      })
    );
  }

  pushCells = (args: PushRowArgs & { table: string }): Promise<number> => {
    const values = {...args.values};
    return insert(this.db, args.table, values);
  }

  loadRowsCount = (args: TableNameArgs): Promise<number> => {
    return (
      get<{count: number}>(this.db, `select count(*) as count from ${args.table}`)
      .then(res => res.count)
    );
  }

  getNumStats = (args: NumStatsArgs): Promise<NumStats> => {
    const { table, column } = args;
    const sql = `select min(${column}) as min, max(${column}) as max from ${table} where ${column}!=""`;
    return get<NumStats>(this.db, sql);
  }

  getColumns(table: string): Promise<Columns> {
    return this.loadTableInfo({ table });
  }

  createSubtable = (args: SubtableAttrs & { table: string }): Promise<CreateSubtableResult> => {
    return (
      this.getColumns(args.table)
      .then(columns => {
        return this.createSubtableImpl({...args, columns});
      })
    );
  }

  createSubtableImpl(args: SubtableAttrs & { table: string, columns: Columns }): Promise<CreateSubtableResult> {
    let tableKey = JSON.stringify(args);
    const subtable = this.subtableMap[tableKey];
    if (subtable) {
      return this.loadRowsCount({table: subtable.subtable})
      .then(rowsNum => ({
        ...subtable,
        rowsNum
      }));
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
    sql += ` as select ${cols} from ${args.table} ${where} ${groupBy} ${orderBy}`;
    console.log(sql);

    return (
      exec(this.db, sql)
      .then(() => this.loadRowsCount({table: newTable}))
      .then(rowsNum => {
        return { ...this.subtableMap[tableKey], rowsNum };
      })
    );
  }

  static SERIALIZE: SERIALIZER = () => ({
    ...Base.SERIALIZE()
  })
}
