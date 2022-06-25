import { STWSchematicRangedSubType } from '../../../resources/structs';
import STWWeaponSchematic from './STWWeaponSchematic';

class STWRangedWeaponSchematic extends STWWeaponSchematic {
  public type!: 'ranged';
  public subType!: STWSchematicRangedSubType;
}

export default STWRangedWeaponSchematic;
