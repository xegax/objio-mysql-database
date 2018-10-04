import * as React from 'react';
import { registerViews, ViewDesc, OBJIOItemClassViewable } from 'objio-object/view/config';
import { Database, Props, DatabaseView, DatabaseConfig } from './database-view';
import { Connect, Props as ConnProps, ConnectView, ConnectConfig } from './connect-view';

export function getViews(): Array<OBJIOItemClassViewable> {
  registerViews({
    classObj: Database,
    views: [{
      view: (props: Props) => <DatabaseView {...props}/>
    }],
    config: props => <DatabaseConfig {...props}/>,
    flags: ['create-wizard'],
    sources: [ [ Connect ] ],
    desc: 'Mysql database'
  });

  registerViews({
    classObj: Connect,
    views: [{
      view: (props: ConnProps) => <ConnectView {...props}/>
    }],
    config: props => <ConnectConfig {...props}/>,
    flags: ['create-wizard'],
    desc: 'Mysql connection'
  });

  return [
    Database,
    Connect
  ];
}
