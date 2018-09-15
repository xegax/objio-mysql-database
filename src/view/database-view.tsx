import * as React from 'react';
import { ConfigBase } from 'objio-object/view/config';
import { Database, DatabaseArgs } from '../client/database';
import { Connect } from '../client/connect';

export { Database };

export interface Props {
  model: Database;
}

export class DatabaseView extends React.Component<Props> {
  subscriber = () => {
    this.setState({});
  }

  componentDidMount() {
    this.props.model.holder.subscribe(this.subscriber);
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.subscriber);
  }

  getServer(): string {
    const cfg = this.props.model.getConnect().getConfig();
    return `${cfg.user}@${cfg.host}:${cfg.port}`;
  }

  getDatabase(): string {
    return this.props.model.getDatabase();
  }

  render() {
    return (
      <div>
        <div>server: {this.getServer()}</div>
        <div>database: {this.getDatabase()}</div>
        <div>tables ({this.props.model.getTableInfo().length})</div>
        <div>
          {this.props.model.getTableInfo().map((table, i) => {
            return <div key={i}>{table.name}</div>;
          })}
        </div>
      </div>
    );
  }
}

export interface State {
  connId: string;
}

export class DatabaseConfig extends ConfigBase<DatabaseArgs, State> {
  state: Readonly<Partial<State>> = {};

  getAvailableConnects(): Array<Connect> {
    return (
      this.props.objects()
      .filter(obj => {
        return obj instanceof Connect;
      })
      .map(obj => obj as Connect)
    );
  }

  componentDidMount() {
    const lst = this.getAvailableConnects();
    if (!lst.length)
      return;

    this.config.connect = lst[0];
    this.config.database = 'test';
    this.setState({ connId: lst[0].holder.getID() });
  }

  onChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    this.config.connect = this.getAvailableConnects().find(obj => obj.holder.getID() == evt.currentTarget.value);
    if (this.config.connect)
      this.setState({ connId: this.config.connect.holder.getID() });
  }

  render() {
    return (
      <div>
        <table>
          <tbody>
            <tr>
              <td>
                connection
              </td>
              <td>
                <select value={this.state.connId} onChange={this.onChange}>
                  {this.getAvailableConnects().map(conn => {
                    return <option value={conn.holder.getID()}>{conn.toString()}</option>;
                  })}
                </select>
              </td>
            </tr>
            <tr>
              <td>
                database
              </td>
              <td>
                <input
                  defaultValue={this.config.database}
                  onChange={e => {
                    this.config.database = e.currentTarget.value;
                  }}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
}
