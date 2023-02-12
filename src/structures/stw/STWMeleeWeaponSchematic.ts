import STWWeaponSchematic from './STWWeaponSchematic';
import type { STWSchematicMeleeSubType } from '../../../resources/structs';

class STWMeleeWeaponSchematic extends STWWeaponSchematic {
  public type!: 'melee';
  public subType!: STWSchematicMeleeSubType;
}

export default STWMeleeWeaponSchematic;
