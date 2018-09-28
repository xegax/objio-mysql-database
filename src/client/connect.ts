import { ObjectBase } from 'objio-object/client/object-base';
import { SERIALIZER } from 'objio';

export interface ConnectArgs {
  host: string;
  port: number;
  user: string;
  password?: string;
}

export class Connect extends ObjectBase {
  private config: Partial<ConnectArgs> = {};

  constructor(args: Partial<ConnectArgs>) {
    super();

    if (args) {
      const { password, ...config } = args;
      this.config = config;
      this.holder.addEventHandler({
        onCreate: () => {
          return this.setPassword({ password });
        }
      });
    }
  }

  getConfig(): Partial<ConnectArgs> {
    return {...this.config};
  }

  setConfig(config: Partial<ConnectArgs>): void {
    this.config = { ...config };
  }

  setPassword(args: {password: string}): Promise<void> {
    return this.holder.invokeMethod({method: 'setPassword', args});
  }

  toString() {
    return `${this.config.user}@${this.config.host}:${this.config.port}`;
  }

  static TYPE_ID = 'MySQLDatabaseConnection';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    'config':   { type: 'json' }
  })
}
