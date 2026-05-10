
import { IViewElement, MetadataHelper, ObjectDef, Objview, RuntimeError, Tarray, Tmap, Tobject } from "../src";
import { AddressInfoDepData, AddressInfoDepView } from "./_type-adressinfodep";
import { AddressInfoRegData, AddressInfoRegView } from "./_type-adressinforeg";
import { XAddressInfoType } from "./_type-xaddressinfo";
import { INT_TYPE, STR_TOKEN, STR_TYPE } from "./_types";


export interface AddressData {
    oid: string;
    kind: string;
    city: string;
    num: number;
    street: string;
    info: AddressInfoRegData | AddressInfoDepData;
}
const AddressDef: ObjectDef<AddressData> = {
    type: 'object',
    title: 'address_type',
    properties: {
        oid: STR_TOKEN,
        kind: STR_TOKEN,
        city: STR_TYPE,
        num: INT_TYPE,
        street: STR_TYPE,
        info: XAddressInfoType
    },
    required: ['oid', 'kind', 'city', 'street', 'info'],
    index: {
        id: 'oid',
        sort: ['oid', 'kind', 'city', 'street', 'num']
    }
};

export const AddressType = new Tobject(AddressDef);

export const AddressCollectionType = new Tarray({
    type: 'array',
    title: 'address_t_array_0_n',
    minlength: 0,
    maxlength: 4,
    items: AddressType
});

export const AddressMapType = new Tmap({
    type: 'map',
    title: 'address_map',
    minlength: 0,
    maxlength: Number.MAX_SAFE_INTEGER,
    items: AddressType,
    key: STR_TOKEN
});


export class AddressView extends Objview<AddressData> implements AddressData {
    constructor(entity?: any, parent?: IViewElement) {
        super(AddressType, entity, parent);
    }
    declare oid: string;
    declare kind: string;
    declare city: string;
    declare num: number;
    declare street: string;
    declare info: AddressInfoRegView | AddressInfoDepView;
    override $asString() {
        const infoType = MetadataHelper.getTypeInfo(this.info)!.type;
        const infoString = infoType.title === 'AddressInfoReg'
            ? AddressInfoRegView.prototype.$asString.apply(this.info)
            : AddressInfoDepView.prototype.$asString.apply(this.info);
        return '' + this.num + ' ' + this.street + ', ' + this.city + ' (' + infoString + ').';
    }
}
AddressType.viewctor = AddressView;

RuntimeError.register('_addressLength', (args) => {
    return `Postal address  should be ${args['maxlength']} max! (it is currently: ${args['actualLength']}).`;
});

AddressType.rules = {
    _: {
        prerequisits: ['kind', 'city', 'num', 'street', 'info'],
        rule: (entity: AddressData) => {
            const adressText = AddressView.prototype.$asString.apply(entity);
            return (adressText.length > 70)
                ? {
                    _addressLength: {
                        actualLength: (adressText ?? '').length,
                        maxlength: 70
                    }
                }
                : undefined;

        }
    }
}