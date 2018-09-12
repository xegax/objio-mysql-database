import * as React from 'react';
import { ClientClass, ViewDesc } from 'objio-object/view/config';
import { OBJIOItemClass } from 'objio';
import { Database, Props, DatabaseView, DatabaseConfig } from './database-view';

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
    desc: 'Mysql database'
  });

  return [
    Database
  ];
}
