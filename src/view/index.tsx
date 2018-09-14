import * as React from 'react';
import { ClientClass, ViewDesc } from 'objio-object/view/config';
import { OBJIOItemClass } from 'objio';
import { Database, Props, DatabaseView, DatabaseConfig } from './database-view';
import { Connect, Props as ConnProps, ConnectView, ConnectConfig } from './connect-view';

interface RegisterArgs extends Partial<ViewDesc> {
  classObj: OBJIOItemClass;
}

function registerViews(args: RegisterArgs) {
  const cc = args.classObj as ClientClass;
  const flags = Array.isArray(args.flags || []) ? new Set(args.flags) : args.flags;
  cc.getViewDesc = (): ViewDesc => {
    return {
      flags,
      desc: args.desc || args.classObj.TYPE_ID,
      views: args.views,
      config: args.config,
      sources: args.sources
    };
  };
}

export function getViews(): Array<OBJIOItemClass & ClientClass> {
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
