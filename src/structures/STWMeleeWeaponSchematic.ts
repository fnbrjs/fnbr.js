import { STWSchematicMeleeSubType } from '../../resources/structs';
import STWWeaponSchematic from './STWWeaponSchematic';

class STWMeleeWeaponSchematic extends STWWeaponSchematic {
  public type!: 'melee';
  public subType!: STWSchematicMeleeSubType;
}

export default STWMeleeWeaponSchematic;
