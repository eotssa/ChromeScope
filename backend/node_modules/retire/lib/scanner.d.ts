import { Finding, Options, Repository } from './types';
export declare function scanJsFile(file: string, repo: Repository, options: Options): void;
export declare function scanBowerFile(file: string, repo: Repository, options: Options): void;
export declare function on(event: 'vulnerable-dependency-found' | 'dependency-found', handler: (finding: Finding) => void): void;
