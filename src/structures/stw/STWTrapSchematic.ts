import { STWSchematicTrapSubType } from '../../../resources/structs';
import STWSchematic from './STWSchematic';

class STWTrapSchematic extends STWSchematic {
  public type!: 'trap';
  public subType!: STWSchematicTrapSubType;
  public evoType!: never;
}

export default STWTrapSchematic;
