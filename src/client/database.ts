import { SERIALIZER } from 'objio';
import { Database as Base } from 'objio-object/client/database';
import { Connect } from './connect';
import { Table } from 'objio-object/client/table';
import { DocTable } from 'objio-object/client/doc-table';

export interface DatabaseArgs {
  connect: Connect;
  database: string;
}

export interface TableInfo {
  name: string;
}

export class Database extends Base {
  protected connect: Connect;
  protected tableInfo = Array<TableInfo>();
  protected database: string;
  protected table: Table;
  protected tableHolder: DocTable;

  constructor(args?: DatabaseArgs) {
    super();

    if (args) {
      this.connect = args.connect;
      this.database = args.database;
      this.table = new Table({ source: this });
    }

    this.holder.addEventHandler({
      onCreate: () => {
        this.tableHolder = new DocTable({
          source: null,
          dest: null,
          tableName: null,
          table: this.table
        });
        return Promise.resolve();
      },
      onLoad: () => {
        this.tableHolder = new DocTable({
          source: null,
          dest: null,
          tableName: null,
          table: this.table
        });
        return Promise.resolve();
      }
    });
  }

  getTable(): DocTable {
    return this.tableHolder;
  }

  getConnect(): Connect {
    return this.connect;
  }

  getDatabase(): string {
    return this.database;
  }

  getTableInfo(): Array<TableInfo> {
    return this.tableInfo;
  }

  static TYPE_ID = 'MySQLDatabase';
  static SERIALIZE: SERIALIZER = () => ({
    ...Base.SERIALIZE(),
    'connect':    { type: 'object', const: true },
    'tableInfo':  { type: 'json' },
    'database':   { type: 'string', const: true },
    'table':      { type: 'object' }
  })
}
