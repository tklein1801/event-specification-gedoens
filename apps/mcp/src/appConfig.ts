import { name, version } from '../package.json';
import { Config } from './lib/config';

export const config = new Config(name, version);
