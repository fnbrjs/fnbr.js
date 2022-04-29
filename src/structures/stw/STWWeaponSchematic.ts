import { STWSchematicEvoType, STWSchematicMeleeSubType, STWSchematicRangedSubType } from '../../../resources/structs';
import STWSchematic from './STWSchematic';

class STWWeaponSchematic extends STWSchematic {
  public type!: 'ranged' | 'melee';
  public subType!: STWSchematicRangedSubType | STWSchematicMeleeSubType;
  public evoType!: STWSchematicEvoType;
}

export default STWWeaponSchematic;
