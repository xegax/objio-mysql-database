import * as React from 'react';
import { ConfigBase } from 'objio-object/view/config';
import { Database, DatabaseArgs } from '../client/database';

export { Database };

interface State {
}

function getAvailableServers(): Array<string> {
  return ['local'];
}

export interface Props {
  model: Database;
}

export class DatabaseView extends React.Component<Props> {
  render() {
    return (
      <div>
        server: {this.props.model.getDBServer()}
      </div>
    );
  }
}

export class DatabaseConfig extends ConfigBase<DatabaseArgs, State> {
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
          <option value={srv}>{srv}</option>
        })}
      </select>
    );
  }
}
