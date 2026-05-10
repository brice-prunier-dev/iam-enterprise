import { IViewElement, ObjectDef, Objview, Tobject } from "../src";
import { STR_TYPE } from "./_types";


export interface AddressInfoDepData {
    departement: string;
}


const AddressInfoDepDef: ObjectDef<AddressInfoDepData> = {
    type: 'object',
    title: 'AddressInfoDepDef',
    properties: {
        departement: STR_TYPE,
    },
    required: ['departement'],
    index: {
        id: 'departement',
        sort: 'departement'
    }
};
export const AddressInfoDepType = new Tobject(AddressInfoDepDef);

export class AddressInfoDepView extends Objview<AddressInfoDepData> implements AddressInfoDepData {
    constructor(entity?: any, parent?: IViewElement) {
        super(AddressInfoDepType, entity, parent);
    }
    declare departement: string;
    override $asString() {
        return this.departement;
    }
}


AddressInfoDepType.viewctor = AddressInfoDepView;

