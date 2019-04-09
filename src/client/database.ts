import { RemoteDatabase, RemoteDatabaseArgs } from 'objio-object/client/database';
export { RemoteDatabaseArgs };

export class Database extends RemoteDatabase {
  getConnection() {
    return this.connection;
  }

  static TYPE_ID = 'MySQLDatabase';
}
