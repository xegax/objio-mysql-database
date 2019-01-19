import * as React from 'react';
import { registerViews, OBJIOItemClassViewable } from 'objio-object/view/config';
import { Database, Props, DatabaseView, DatabaseConfig } from './database-view';
import { Props as ConnProps, ConnectionView, ConnectionConfig } from 'objio-object/view/connection-view';
import { Connection } from '../client/connection';

export function getViews(): Array<OBJIOItemClassViewable> {
  registerViews({
    classObj: Database,
    views: [{
      view: (props: Props) => <DatabaseView {...props}/>
    }],
    config: props => <DatabaseConfig {...props}/>,
    flags: ['create-wizard'],
    sources: [ [ Connection ] ],
    desc: 'Mysql database'
  });

  registerViews({
    classObj: Connection,
    views: [{
      view: (props: ConnProps) => <ConnectionView {...props}/>
    }],
    config: props => <ConnectionConfig {...props}/>,
    flags: ['create-wizard'],
    desc: 'Mysql connection'
  });

  return [
    Database,
    Connection
  ];
}
