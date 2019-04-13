import * as mysql from 'mysql';
import { ConnectionBase } from 'objio-object/base/database/connection';
import { SERIALIZER } from 'objio';

export class Connection extends ConnectionBase {
  private password: string;
  private mysqlConn: mysql.Connection;
  private task: Promise<any>;

  constructor() {
    super();

    this.holder.setMethodsToInvoke({
      setPassword: {
        method: (args: { password: string }) => this.setPassword(args),
        rights: 'write'
      },
      reconnect: {
        method: () => this.reconnect(),
        rights: 'write'
      }
    });

    this.holder.addEventHandler({
      onLoad: () => {
        this.connected = false;
        this.holder.save();
        return this.tryToReconnect();
      }
    });
  }

  private tryToReconnect() {
    if (this.task)
      this.task = this.task.then(this.tryToReconnectImpl);
    else
      this.task = this.tryToReconnectImpl();

    this.task.finally(() => {
      this.task = null;
    });

    return this.task;
  }

  private tryToReconnectImpl = () => {
    const cfg: mysql.ConnectionConfig = {
      host: this.host,
      port: this.port,
      user: this.user,
      password: this.password,
      insecureAuth: true,
      multipleStatements: true
    };

    let p = Promise.resolve();
    if (this.mysqlConn && this.mysqlConn.state == 'authenticated') {
      p = new Promise((resolve, reject) => {
        this.mysqlConn.end(err => {
          this.setConnected(false);
          if (err)
            return reject(err);

          resolve();
        });
      });
    }

    return p.then(() => {
      this.mysqlConn = mysql.createConnection(cfg);
      return new Promise((resolve, reject) => {
        this.mysqlConn.connect(err => {
          if (err)
            return reject(err);

          resolve();
          this.setConnected(true);
        });

        this.mysqlConn.on('error', err => {
          console.log('MySQLConnection error occured', err);
        });
        this.mysqlConn.on('end', err => {
          console.log('connection is end', err);
          this.setConnected(false);
        });
      });
    });
  }

  setConnected(conn: boolean) {
    if (conn == this.connected)
      return;

    this.connected = conn;
    this.holder.save();
  }

  getPassword(): string {
    return this.password;
  }

  setPassword(args: { password: string }): Promise<boolean> {
    this.password = args.password;
    console.log(this.password, args);
    this.holder.save();

    return Promise.resolve(true);
  }

  reconnect() {
    if (this.task)
      return Promise.reject('reconnect in progress');

    return this.tryToReconnect();
  }

  getRef(): mysql.Connection {
    return this.mysqlConn;
  }

  static TYPE_ID = 'MySQLDatabaseConnection';
  static SERIALIZE: SERIALIZER = () => ({
    ...ConnectionBase.SERIALIZE(),
    'password': { type: 'string', tags: [ 'sr' ] }
  })
}
