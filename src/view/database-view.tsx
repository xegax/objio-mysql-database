import * as React from 'react';
import { ConfigBase } from 'objio-object/view/config';
import { Database, DatabaseArgs } from '../client/database';

export { Database };

function getAvailableServers(): Array<string> {
  return ['local'];
}

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

  render() {
    return (
      <div>
        <div>server: {this.props.model.getDBServer()}</div>
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

export class DatabaseConfig extends ConfigBase<DatabaseArgs, {}> {
  componentDidMount() {
    const lst = getAvailableServers();
    this.config.dbServer = lst[0];
  }

  onChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    this.config.dbServer = evt.currentTarget.value;
    this.setState({});
  }

  render() {
    return (
      <select value={this.config.dbServer} onChange={this.onChange}>
        {getAvailableServers().map(srv => {
          return <option value={srv}>{srv}</option>;
        })}
      </select>
    );
  }
}
