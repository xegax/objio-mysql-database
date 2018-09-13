import { SERIALIZER } from 'objio';
import { Database as Base } from 'objio-object/client/database';

export interface DatabaseArgs {
  dbServer: string;
}

export interface Table {
  name: string;
}

export class Database extends Base {
  protected dbServer: string;
  protected tableInfo = Array<Table>();

  constructor(args?: DatabaseArgs) {
    super();

    if (args)
      this.dbServer = args.dbServer;
  }

  getDBServer(): string {
    return this.dbServer;
  }

  getTableInfo(): Array<Table> {
    return this.tableInfo;
  }

  static TYPE_ID = 'MySQLDatabase';
  static SERIALIZE: SERIALIZER = () => ({
    ...Base.SERIALIZE(),
    'dbServer':   { type: 'string', const: true },
    'tableInfo':  { type: 'json' }
  })
}
