import { RemoteDatabaseClient } from 'objio-object/base/database/database';
import { DatabaseBase } from '../base/database';
import { Connection } from './connection';

export class Database extends RemoteDatabaseClient {
  getConnClasses() {
    return [ Connection ];
  }

  static TYPE_ID = DatabaseBase.TYPE_ID;
}
