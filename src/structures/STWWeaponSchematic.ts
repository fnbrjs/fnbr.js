import { STWSchematicEvoType, STWSchematicMeleeSubType, STWSchematicRangedSubType } from '../../resources/structs';
import STWSchematic from './STWSchematic';

interface STWWeaponSchematic {
  type: 'ranged' | 'melee';
  subType: STWSchematicRangedSubType | STWSchematicMeleeSubType;
  evoType: STWSchematicEvoType;
}

class STWWeaponSchematic extends STWSchematic { }

export default STWWeaponSchematic;
