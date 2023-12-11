import { Options } from './types';
import { Vulnerability } from './types';
export declare function checkOSV(packageName: string, version: string, options: Options): Promise<Vulnerability[]>;
