import { RemoteDatabase, RemoteDatabaseArgs } from 'objio-object/client/database';
import { ConnectionBase } from 'objio-object/base/database';
export { RemoteDatabaseArgs };

export class Database extends RemoteDatabase {
  getConnection(): ConnectionBase {
    return this.connection;
  }

  static TYPE_ID = 'MySQLDatabase';
}
