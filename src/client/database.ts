import { SERIALIZER } from 'objio';
import { Database as Base } from 'objio-object/client/database';

export interface DatabaseArgs {
  dbServer: string;
}

export class Database extends Base {
  protected dbServer: string;

  constructor(args?: DatabaseArgs) {
    super();

    if (args)
      this.dbServer = args.dbServer;
  }

  getDBServer(): string {
    return this.dbServer;
  }

  static TYPE_ID = 'MySQLDatabase';
  static SERIALIZE: SERIALIZER = () => ({
    ...Base.SERIALIZE(),
    'dbServer': { type: 'string', const: true }
  })
}
