import { IViewElement, Mapview, ObjectDef, Objview, StringMap, Tobject } from "../src";
import { AddressData, AddressMapType, AddressView } from "./_type-adress";
import { PersonNameData, PersonNameType, PersonNameView } from "./_type-personname";
import { STR_TOKEN, STR_TYPE } from "./_types";


export interface PersonData {
    oid: string;
    name: PersonNameData;
    addresses: StringMap<AddressData>;
}

const PersonDef: ObjectDef<PersonData> = {
    type: 'object',
    title: 'person_type',
    properties: {
        oid: STR_TOKEN,
        name: PersonNameType,
        addresses: AddressMapType
    },
    required: ['oid', 'name', 'addresses'],
    index: {
        id: 'oid',
        sort: ['name>last', 'name>first']
    }
};
export const PersonType = new Tobject(PersonDef);
export class PersonView extends Objview<PersonData> implements PersonData {
    constructor(entity?: any, parent?: IViewElement) {
        super(PersonType, entity);
    }
    declare oid: string;
    declare name: PersonNameView;
    declare addresses: Mapview<AddressView>;
}
PersonType.viewctor = PersonView;