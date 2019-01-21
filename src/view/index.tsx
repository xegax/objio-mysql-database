import * as React from 'react';
import { registerViews, OBJIOItemClassViewable } from 'objio-object/view/config';
import { Database, Props, DatabaseView, DatabaseConfig } from './database-view';
import { Props as ConnProps, ConnectionView, ConnectionConfig } from 'objio-object/view/connection-view';
import { Connection } from '../client/connection';
import 'ts-react-ui/typings';
import { Icon } from 'ts-react-ui/icon';
import * as ConnIcon from '../images/mysql-connection.svg';
import * as DBIcon from '../images/mysql-database.svg';

export function getViews(): Array<OBJIOItemClassViewable> {
  registerViews({
    classObj: Database,
    views: [{
      view: (props: Props) => <DatabaseView {...props}/>
    }],
    config: props => <DatabaseConfig {...props}/>,
    flags: ['create-wizard'],
    sources: [ [ Connection ] ],
    desc: 'Mysql database',
    icons: { item:  <Icon src={DBIcon}/> }
  });

  registerViews({
    classObj: Connection,
    views: [{
      view: (props: ConnProps) => <ConnectionView {...props}/>
    }],
    config: props => <ConnectionConfig {...props}/>,
    flags: ['create-wizard'],
    desc: 'Mysql connection',
    icons: { item:  <Icon src={ConnIcon}/> }
  });

  return [
    Database,
    Connection
  ];
}
