import { IViewElement, ObjectDef, Objview, Tobject } from "../src";
import { STR_TYPE } from "./_types";

export interface AddressInfoRegData {
    region: string;
}
const AddressInfoRegDef: ObjectDef<AddressInfoRegData> = {
    type: 'object',
    title: 'AddressInfoReg',
    properties: {
        region: STR_TYPE,
    },
    required: ['region']
};
export const AddressInfoRegType = new Tobject(AddressInfoRegDef);


export class AddressInfoRegView extends Objview<AddressInfoRegData> implements AddressInfoRegData {
    constructor(entity?: any, parent?: IViewElement) {
        super(AddressInfoRegType, entity, parent);
    }
    declare region: string;
    override $asString() {
        return this.region;
    }
}
AddressInfoRegType.viewctor = AddressInfoRegView;