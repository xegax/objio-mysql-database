import { SERIALIZER } from 'objio';
import { Database as Base } from 'objio-object/client/database';
import { Connect } from './connect';

export interface DatabaseArgs {
  connect: Connect;
}

export interface Table {
  name: string;
}

export class Database extends Base {
  protected connect: Connect;
  protected tableInfo = Array<Table>();

  constructor(args?: DatabaseArgs) {
    super();

    if (args)
      this.connect = args.connect;
  }

  getConnect(): Connect {
    return this.connect;
  }

  getTableInfo(): Array<Table> {
    return this.tableInfo;
  }

  static TYPE_ID = 'MySQLDatabase';
  static SERIALIZE: SERIALIZER = () => ({
    ...Base.SERIALIZE(),
    'connect':    { type: 'object', const: true },
    'tableInfo':  { type: 'json' }
  })
}
