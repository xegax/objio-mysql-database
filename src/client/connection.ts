import { Connection as ConnectionBase, ConnectionArgs } from 'objio-object/client/database/connection';

export { ConnectionArgs };

export class Connection extends ConnectionBase {
  static TYPE_ID = 'MySQLDatabaseConnection';
}
