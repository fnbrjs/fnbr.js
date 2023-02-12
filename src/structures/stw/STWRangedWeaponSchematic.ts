import STWWeaponSchematic from './STWWeaponSchematic';
import type { STWSchematicRangedSubType } from '../../../resources/structs';

class STWRangedWeaponSchematic extends STWWeaponSchematic {
  public type!: 'ranged';
  public subType!: STWSchematicRangedSubType;
}

export default STWRangedWeaponSchematic;
