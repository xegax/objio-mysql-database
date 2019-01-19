import { OBJIOItemClass } from 'objio';
import { Database } from './database';
import { Connection } from './connection';

export function getClasses(): Array<OBJIOItemClass> {
  return [
    Database,
    Connection
  ];
}
