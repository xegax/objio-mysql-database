import { SERIALIZER } from 'objio';
import { Database as Base } from 'objio-object/client/database';
import { Connect } from './connect';

export interface DatabaseArgs {
  connect: Connect;
  database: string;
}

export interface Table {
  name: string;
}

export class Database extends Base {
  protected connect: Connect;
  protected tableInfo = Array<Table>();
  protected database: string;

  constructor(args?: DatabaseArgs) {
    super();

    if (args) {
      this.connect = args.connect;
      this.database = args.database;
    }
  }

  getConnect(): Connect {
    return this.connect;
  }

  getDatabase(): string {
    return this.database;
  }

  getTableInfo(): Array<Table> {
    return this.tableInfo;
  }

  static TYPE_ID = 'MySQLDatabase';
  static SERIALIZE: SERIALIZER = () => ({
    ...Base.SERIALIZE(),
    'connect':    { type: 'object', const: true },
    'tableInfo':  { type: 'json' },
    'database':   { type: 'string', const: true }
  })
}
