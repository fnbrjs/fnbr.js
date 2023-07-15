import STWSchematic from './STWSchematic';
import type { STWSchematicEvoType, STWSchematicMeleeSubType, STWSchematicRangedSubType } from '../../../resources/structs';

class STWWeaponSchematic extends STWSchematic {
  public type!: 'ranged' | 'melee';
  public subType!: STWSchematicRangedSubType | STWSchematicMeleeSubType;
  public evoType!: STWSchematicEvoType;
}

export default STWWeaponSchematic;
