import { RemoteDatabaseBase } from 'objio-object/base/database/database';

export abstract class DatabaseBase extends RemoteDatabaseBase {
  static TYPE_ID = 'MYSQL-DATABASE';
}
