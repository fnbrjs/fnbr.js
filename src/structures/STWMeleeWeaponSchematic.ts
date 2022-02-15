import { STWSchematicMeleeSubType } from '../../resources/structs';
import STWWeaponSchematic from './STWWeaponSchematic';

interface STWMeleeWeaponSchematic {
  type: 'melee';
  subType: STWSchematicMeleeSubType;
}

class STWMeleeWeaponSchematic extends STWWeaponSchematic {}

export default STWMeleeWeaponSchematic;
