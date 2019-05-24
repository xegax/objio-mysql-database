import * as mysql from 'mysql';
import { ColumnAttr, Columns, PushRowArgs } from './mysql-decl';
import { func } from 'prop-types';

export function loadRowsNum(conn: mysql.Connection, db: string, table: string): Promise<number> {
  return (
    get<{count: number}>(conn, `select count(*) as count from ${db}.${table}`)
    .then(res => res.count)
  );
}

export function exec(conn: mysql.Connection, sql: string): Promise<any> {
  return new Promise((resolve, reject) => {
    conn.query(sql, err => {
      if (!err) {
        resolve();
      } else {
        console.log('error at', sql);
        reject(err);
      }
    });
  });
}

export function run(conn: mysql.Connection, sql: string, params: Array<any>): Promise<any> {
  return new Promise((resolve, reject) => {
    conn.query(sql, params, err => {
      if (!err) {
        resolve();
      } else {
        console.log(err);
        // console.log('error at', sql);
        reject(err);
      }
    });
  });
}

export function all<T = Object>(conn: mysql.Connection, sql: string, params?: Array<any>): Promise<Array<T>> {
  return new Promise((resolve, reject) => {
    conn.query(sql, params || [], (err, rows: Array<T>) => {
      if (err)
        return reject(err);
      resolve(rows);
    });
  });
}

export function get<T = Object>(conn: mysql.Connection, sql: string): Promise<T> {
  return new Promise((resolve, reject) => {
    conn.query(sql, (err, rows: T) => {
      if (err)
        return reject(err);
      resolve(rows[0]);
    });
  });
}

export function createTable(conn: mysql.Connection, db: string, table: string, columns: Columns): Promise<any> {
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

  return (
    exec(conn, `create table ${db}.${table} (${sql})`)
    .then(() => {
      return Promise.all(columns.filter(col => col.index).map(col => {
        let colName = col.name;
        if (col.type == 'TEXT')
          colName = `${colName}(10)`;
        return exec(conn, `create index idx_${col.name} on ${db}.${table}(${colName})`);
      }));
    })
  );
}

export function deleteTable(conn: mysql.Connection, db: string, table: string): Promise<void> {
  return exec(conn, `drop table if exists ${db}.${table}`);
}

export function deleteData(args: {conn: mysql.Connection, db: string, table: string, where?: string}): Promise<void> {
  let where = args.where || '';
  if (where)
    where = `where ${where}`;
  const sql = `delete from ${args.db}.${args.table} ${where}`;

  return exec(args.conn, sql);
}

export function loadTableList(conn: mysql.Connection, db: string) {
  return (
    all(conn, `show tables from ${db}`)
    .then(tables => {
      const arr: Array<string> = tables.map(table => {
        return table[Object.keys(table)[0]];
      });

      return arr;
    })
  );
}

export function loadDatabaseList(db: mysql.Connection) {
  return (
    all(db, 'show databases')
    .then(dblist => {
      const arr: Array<string> = dblist.map(db => {
        return db[Object.keys(db)[0]];
      });

      return arr;
    })
  );
}

export function loadTableInfo(conn: mysql.Connection, db: string, table: string): Promise<Columns> {
  return all<ColumnAttr>(conn, `describe ${db}.${table}`).then(res => {
    return res.map(row => ({name: row['Field'], type: row['Type']}));
  });
}

export function deleteDatabase(conn: mysql.Connection, db: string) {
  return exec(conn, `drop database ${db}`);
}

export function createDatabase(conn: mysql.Connection, db: string) {
  return exec(conn, `create database ${db}`);
}

export function insert(args: PushRowArgs & { db: string, table: string; conn: mysql.Connection }): Promise<any> {
  const cols: {[name: string]: number} = {};
  const valuesArr = Array<string>();
  const holderArr = Array<string>();
  const values = args.values;
  if (!args.columns) {
    for (let n = 0; n < values.length; n++) {
      const keys = Object.keys(values[n]);
      for (let c = 0; c < keys.length; c++) {
        cols[ keys[c] ] = ( cols[ keys[c] ] || 0 ) + 1;
      }
    }
  }

  const colsArr = args.columns || Object.keys(cols);
  for (let n = 0; n < values.length; n++) {
    for (let c = 0; c < colsArr.length; c++) {
      valuesArr.push(values[n][ colsArr[c] ] as string || null);
    }
    holderArr.push( '(' + colsArr.map(() => '?').join(',') + ')' );
  }

  const allCols = Object.keys(cols).map(name => name).join(',');
  const sql = `insert into ${args.db}.${args.table}(${allCols}) values ${holderArr.join(',')};`;
  return run(args.conn, sql, valuesArr);
}
