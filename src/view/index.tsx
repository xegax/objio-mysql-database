import * as React from 'react';
import { registerViews, OBJIOItemClassViewable } from 'objio-object/view/config';
import { Props as ConnProps, ConnectionView } from 'objio-object/view/connection-view';
import { Connection } from '../client/connection';
import 'ts-react-ui/typings';
import * as ConnIcon from '../images/mysql-connection.svg';
import * as DBIcon from '../images/mysql-database.svg';
import { ObjectToCreate }  from 'objio-object/common/interfaces';
import { DatabaseHolder } from 'objio-object/client/database/database-holder';
import { Database } from '../client/database';
import { IconSVG } from 'ts-react-ui/icon-svg';

export function getObjectsToCreate(): Array<ObjectToCreate> {
  return [
    {
      name: 'mysql',
      desc: 'mysql database',
      icon: <IconSVG icon={DBIcon}/>,
      create: () => new DatabaseHolder({ impl: new Database() })
    }, {
      name: 'mysql connection',
      desc: 'mysql connection',
      create: () => new Connection() as any
    }
  ];
}

export function getViews(): Array<OBJIOItemClassViewable> {
  registerViews({
    classObj: Connection,
    views: [{
      view: (props: ConnProps) => <ConnectionView {...props}/>
    }],
    desc: 'Mysql connection',
    icons: { item:  <IconSVG icon={ConnIcon}/> }
  });

  return [
    Connection
  ];
}
