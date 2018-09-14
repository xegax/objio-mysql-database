import { OBJIOItemClass } from 'objio';
import { Database } from './database';
import { Connect } from './connect';

export function getClasses(): Array<OBJIOItemClass> {
  return [
    Database,
    Connect
  ];
}
