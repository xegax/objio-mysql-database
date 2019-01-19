import { RemoteDatabaseBase } from 'objio-object/base/database/remote-database';
import { TableInfo } from 'objio-object/base/database';

export { TableInfo };

export abstract class DatabaseBase extends RemoteDatabaseBase {
  static TYPE_ID = 'MySQLDatabase';
}
