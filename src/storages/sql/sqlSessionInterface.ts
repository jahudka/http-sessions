import type { ValueMap } from '../../types';

export interface SQLSessionInterface {
  id: string;
  lockId?: string;
  lockExpires?: Date;
  expires?: Date;
  data?: ValueMap;
}
