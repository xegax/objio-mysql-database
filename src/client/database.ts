import { RemoteDatabase, RemoteDatabaseArgs } from 'objio-object/client/database';
import { Connection } from './connection';
export { RemoteDatabaseArgs };

export class Database extends RemoteDatabase {
  getConnection(): Connection {
    return this.connection;
  }

  static TYPE_ID = 'MySQLDatabase';
}
