import { Connect as Base, ConnectArgs } from '../client/connect';
import { SERIALIZER } from 'objio';

export class Connect extends Base {
  private password: string;

  constructor(args?: ConnectArgs) {
    super(args);

    this.holder.setMethodsToInvoke({
      setPassword: {
        method: (args: {password: string}) => this.setPassword(args),
        rights: 'write'
      }
    });
  }

  getPassword(): string {
    return this.password;
  }

  setPassword(args: {password: string}): Promise<void> {
    this.password = args.password;
    this.holder.save();
    return Promise.resolve();
  }

  static SERIALIZE: SERIALIZER = () => ({
    ...Base.SERIALIZE(),
    'password': { type: 'string', tags: [ 'sr' ] }
  });
}