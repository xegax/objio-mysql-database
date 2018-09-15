import * as React from 'react';
import { Connect, ConnectArgs } from '../client/connect';
import { ConfigBase } from 'objio-object/view/config';

export { Connect };

export interface Props {
  model: Connect;
}

export class ConnectView extends React.Component<Props> {
  render() {
    return (
      this.props.model.toString()
    );
  }
}

export class ConnectConfig extends ConfigBase<ConnectArgs> {
  componentDidMount() {
    this.config.host = 'localhost';
    this.config.port = 3306;
    this.config.user = 'root';
    this.setState({});
  }

  render() {
    return (
      <table>
        <tbody>
          <tr>
            <td>host</td>
            <td>
              <input
                defaultValue={this.config.host}
                onChange={evt => this.config.host = evt.currentTarget.value}
              />
            </td>
          </tr>
          <tr>
            <td>port</td>
            <td>
              <input
                defaultValue={this.config.port != null ? '' + this.config.port : null}
                onChange={evt => this.config.port = +evt.currentTarget.value}
              />
            </td>
          </tr>
          <tr>
            <td>user</td>
            <td>
              <input
                defaultValue={this.config.user}
                onChange={evt => this.config.user = evt.currentTarget.value}
              />
            </td>
          </tr>
          <tr>
            <td>password</td>
            <td>
              <input
                defaultValue=''
                onChange={evt => this.config.password = evt.currentTarget.value}
              />
            </td>
          </tr>
        </tbody>
      </table>
    );
  }
}
