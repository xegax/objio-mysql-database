import { OBJIOItemClass } from 'objio';
import { Connection } from './connection';
import { Database2 } from './database2';

export function getClasses(): Array<OBJIOItemClass> {
  return [
    Database2,
    Connection
  ];
}
