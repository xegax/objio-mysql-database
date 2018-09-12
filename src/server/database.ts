import * as mysql from 'mysql';
import { Database as Base, DatabaseArgs } from '../client/database';
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

/*function srPromise(db: mysql.Connection, callback: (resolve, reject) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      callback(resolve, reject);
    });
  });
}*/

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
    if (column.notNull)
      value += ' NOT NULL';
    if (column.primary)
      value += ' PRIMARY KEY';
    if (column.autoInc)
      value += ' AUTOINCREMENT';
    if (column.unique)
      value += ' UNIQUE';
    return value;
  }).join(', ');
  return exec(db, `create table ${table} (${sql})`);
}

function deleteTable(db: mysql.Connection, table: string): Promise<void> {
  return exec(db, `drop table if exists ${table}`);
}

function loadTableInfo(db: mysql.Connection, table: string): Promise<Columns> {
  return all<ColumnAttr>(db, `pragma table_info(${table})`).then(res => {
    return res.map(row => ({name: row['name'], type: row['type']}));
  });
}

function insert(db: mysql.Connection, table: string, values: {[col: string]: Array<string>}): Promise<any> {
  const cols = Object.keys(values);
  const valsHolder = cols.map(() => '?').join(', ');
  const allValsHolder = values[cols[0]].map(() => `( ${valsHolder} )`).join(', ');

  const valuesArr = [];
  const rowsNum = values[cols[0]].length;
  for (let n = 0;  n < rowsNum; n++) {
    cols.forEach(col => {
      valuesArr.push(values[col][n]);
    });
  }

  const sql = `insert into ${table}(${cols.join(',')}) values ${allValsHolder};`;
  return run(db, sql, valuesArr);
}

const servers: {[key: string]: mysql.ConnectionConfig} = {
  'local': {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'root'
  }
};

let subtableCounter: number = 0;
export class Database extends Base {
  private db: mysql.Connection;
  private subtableMap: {[key: string]: { subtable: string, columns: Array<ColumnAttr> }} = {};

  constructor() {
    super();

    this.holder.addEventHandler({
      onCreate: () => {
        console.log('mysql db create');
        return this.openDB({ ...servers[this.dbServer] });
      },
      onLoad: () => {
        console.log('mysql db load');
        return this.openDB({ ...servers[this.dbServer] });
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

  loadTableInfo = (args: TableNameArgs) => {
    return loadTableInfo(this.db, args.table);
  }

  openDB(args: mysql.ConnectionConfig): Promise<mysql.Connection> {
    if (this.db)
      return Promise.resolve(this.db);

    return new Promise((resolve, reject) => {
      this.db = mysql.createConnection(args);
      this.db.connect(err => {
        if (err)
          reject(err);
        else
          resolve(this.db);
      });
    });
  }

  createTable = (args: TableColsArgs): Promise<void> => {
    return createTable(this.db, args.table, args.columns);
  }

  deleteTable = (args: TableNameArgs): Promise<void> => {
    return deleteTable(this.db, args.table);
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

    const sql = `create temp table ${newTable} as select ${cols} from ${args.table} ${where} ${groupBy} ${orderBy}`;
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
    ...Base.SERIALIZE(),
    'connArgs': { type: 'json', tags: ['sr'] }
  })
}
