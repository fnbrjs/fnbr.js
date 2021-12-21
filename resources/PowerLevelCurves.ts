import HomebaseRatingMapping from './HomebaseRatingMapping.json';
import BaseItemRating from './BaseItemRating.json';
import SurvivorItemRating from './SurvivorItemRating.json';
import CurveTable, { CurveKey } from '../src/util/CurveTable';

function mapCurveTables<T extends { [k: keyof any]: { Keys: CurveKey[] } }>(struc: T) {
    const entries1 = Object.entries(struc);
    const entries2 = entries1.map(([k, v]) => [k.toLowerCase(), Object.freeze(new CurveTable(v.Keys))]);
    const obj = Object.fromEntries(entries2) as { [K in keyof T as Lowercase<string & K>]: Readonly<CurveTable> };
    return Object.freeze(obj);
}

export default Object.freeze({
    homebaseRating: Object.freeze(new CurveTable(HomebaseRatingMapping[0].ExportValue.UIMonsterRating.Keys)),
    baseItemRating: mapCurveTables(BaseItemRating[0].ExportValue),
    survivorItemRating: mapCurveTables(SurvivorItemRating[0].ExportValue),
});
