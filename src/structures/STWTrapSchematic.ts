import { STWSchematicTrapSubType } from '../../resources/structs';
import STWSchematic from './STWSchematic';

interface STWTrapSchematic {
  type: 'trap';
  subType: STWSchematicTrapSubType;
  evoType: never;
}

class STWTrapSchematic extends STWSchematic {}

export default STWTrapSchematic;
