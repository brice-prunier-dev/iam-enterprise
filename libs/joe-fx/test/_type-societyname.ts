import { IViewElement, ObjectDef, Objview, Tobject } from "../src";
import { STR_TYPE } from "./_types";

export interface SocietyNameData {
    common: string;
    legal: string;
}

const SocietyNameDef: ObjectDef<SocietyNameData> = {
    type: 'object',
    title: 'societyname_type',
    properties: {
        common: STR_TYPE,
        legal: STR_TYPE
    },
    required: ['common', 'legal'],
    index: {
        id: ['common'],
        sort: ['legal']
    }
};
export const SocietyNameType = new Tobject(SocietyNameDef);

export class SocietyNameView extends Objview<SocietyNameData> implements SocietyNameData {
    constructor(entity?: any, parent?: IViewElement) {
        super(SocietyNameType, entity, parent);
    }
    declare common: string;
    declare legal: string;
    override $asString() {
        return this.legal + '.';
    }
}
SocietyNameType.viewctor = SocietyNameView;
