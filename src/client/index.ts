import { OBJIOItemClass } from 'objio';
import { Connection } from './connection';
import { Database } from './database';

export function getClasses(): Array<OBJIOItemClass> {
  return [
    Database,
    Connection
  ];
}
