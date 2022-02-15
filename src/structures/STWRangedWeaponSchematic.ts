import { STWSchematicRangedSubType } from '../../resources/structs';
import STWWeaponSchematic from './STWWeaponSchematic';

interface STWRangedWeaponSchematic {
  type: 'ranged';
  subType: STWSchematicRangedSubType;
}

class STWRangedWeaponSchematic extends STWWeaponSchematic {}

export default STWRangedWeaponSchematic;
