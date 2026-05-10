import { IViewElement, Objview, Tobject } from "../src";
import { AddressData, AddressType, AddressView } from "./_type-adress";
import { RelationLookupLocalData, RelationLookupLocalDefFactory } from "./_type-relationlookup";


const LookupLocalAddressDef = RelationLookupLocalDefFactory(AddressType);
const LookupLocalAddressType = new Tobject(LookupLocalAddressDef);
export class LookupLocalAddressView
    extends Objview<RelationLookupLocalData<AddressData>>
    implements RelationLookupLocalData<AddressData> {
    constructor(entity?: any, parent?: IViewElement) {
        super(LookupLocalAddressType, entity, parent);
    }
    refType!: string;
    rev?: string;
    refId!: string;
    path!: string;
    title?: string;
    value!: AddressView;
}
LookupLocalAddressType.viewctor = LookupLocalAddressView;
