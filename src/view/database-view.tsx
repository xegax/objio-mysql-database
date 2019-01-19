import * as React from 'react';
import { ConfigBase } from 'objio-object/view/config';
import { Database, RemoteDatabaseArgs } from '../client/database';
import { Connection } from '../client/connection';
import { PropItem, DropDownPropItem, PropsGroup, TextPropItem } from 'ts-react-ui/prop-sheet';
import { connect } from 'net';

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
    const conn = this.props.model.getConnection();
    return `${conn.getUser()}@${conn.getHost()}:${conn.getPort()}`;
  }

  getDatabase(): string {
    return this.props.model.getDatabase();
  }

  renderTable() {
    /*const table = this.props.model.getTable();
    if (!table.getTableName())
      return;

    const objClass = OBJIOItem.getClass(table) as OBJIOItemClassViewable;
    const views = objClass.getViewDesc();
    return (
      views.views[0].view({ model: table })
    );*/

    return null;
  }

  render() {
    return (
      <div style={{display: 'flex', flexGrow: 1, flexDirection: 'column'}}>
        <div style={{flexGrow: 0}}>
          <div>server: {this.getServer()}</div>
          <div>database: {this.getDatabase()}</div>
          <div>tables ({this.props.model.getTables().length})</div>
          <div>
            {this.props.model.getTables().map((table, i) => {
              return (
                <div key={i} onClick={() => {
                  /*this.props.model.getTable().setTableName(table.name)
                  .then(() => {
                    this.props.model.holder.notify();
                  });*/
                }}>
                  {table.name}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{display: 'flex', flexGrow: 1}}>
          {this.renderTable()}
        </div>
      </div>
    );
  }
}

export class DatabaseConfig extends ConfigBase<RemoteDatabaseArgs> {
  getAvailableConnects(): Array<Connection> {
    return (
      this.props.objects()
      .filter(obj => obj instanceof Connection)
      .map(obj => obj as Connection)
    );
  }

  componentDidMount() {
    const lst = this.getAvailableConnects();
    if (!lst.length)
      return;

    this.config.connection = lst[0];
    this.config.database = 'test';
  }

  render() {
    return (
      <PropsGroup label='database'>
        <DropDownPropItem
          value={this.config.connection && { value: this.config.connection.holder.getID() }}
          values={this.getAvailableConnects().map(conn => {
            return {
              value: conn.holder.getID(),
              render: conn.getName(),
              title: '?',
              conn
            };
          })}
          onSelect={conn => {
            this.config.connection = conn['conn'];
          }}
        />
        <TextPropItem
          value={this.config.database}
          onEnter={database => {
            this.config.database = database;
          }}
        />
      </PropsGroup>
    );
  }
}
