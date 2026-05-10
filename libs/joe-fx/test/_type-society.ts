import { IViewElement, ObjectDef, Objview, Setview, Tobject } from "../src";
import { AddressCollectionType, AddressData, AddressView } from "./_type-adress";
import { SocietyNameData, SocietyNameType, SocietyNameView } from "./_type-societyname";
import { STR_TOKEN, STR_TYPE } from "./_types";

export interface SocietyData {
    oid: string;
    name: SocietyNameData;
    addresses: AddressData[];
}

const SocietyDef: ObjectDef<SocietyData> = {
    type: 'object',
    title: 'society_type',
    properties: {
        oid: STR_TOKEN,
        name: SocietyNameType,
        addresses: AddressCollectionType
    },
    required: ['oid', 'name', 'addresses'],
    index: {
        id: 'oid',
        sort: 'name'
    }
};
export const SocietyType = new Tobject(SocietyDef);
export class SocietyView extends Objview<SocietyData> implements SocietyData {
    constructor(entity?: any, parent?: IViewElement) {
        super(SocietyType, entity);
    }
    declare oid: string;
    declare name: SocietyNameView;
    declare addresses: Setview<AddressView>;
}
SocietyType.viewctor = SocietyView;
