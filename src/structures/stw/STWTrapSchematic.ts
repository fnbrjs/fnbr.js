import STWSchematic from './STWSchematic';
import type { STWSchematicTrapSubType } from '../../../resources/structs';

class STWTrapSchematic extends STWSchematic {
  public type!: 'trap';
  public subType!: STWSchematicTrapSubType;
  public evoType!: never;
}

export default STWTrapSchematic;
