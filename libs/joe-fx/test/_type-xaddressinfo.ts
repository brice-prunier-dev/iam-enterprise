import { JsonObj, OType, Txobject, XObjectDef } from "../src";
import { AddressInfoDepData, AddressInfoDepType } from "./_type-adressinfodep";
import { AddressInfoRegData, AddressInfoRegType } from "./_type-adressinforeg";


function getIndexObjFromValue(obj: AddressInfoRegData | AddressInfoDepData): JsonObj {
    return (obj as AddressInfoRegData).region === undefined
        ? {departement: (obj as AddressInfoDepData).departement}
        : {region: (obj as AddressInfoRegData).region};
}

function getType(obj: AddressInfoRegData | AddressInfoDepData): OType {
    return (obj as AddressInfoRegData).region === undefined
        ? AddressInfoDepType as OType
        : AddressInfoRegType as OType;
}
/** 
 *  userName, login, snowId, profileRef{}, appRef{}
 */
export const XAddressInfoDef: XObjectDef<AddressInfoRegData | AddressInfoDepData> = {
    type: 'xobject',
    title: 'XAddressInfo',
    anyOf: [
        AddressInfoRegType,
        AddressInfoDepType
    ],
    getIndexObjFromValue: getIndexObjFromValue,
    getType: getType,

};

export const XAddressInfoType: Txobject = new Txobject<AddressInfoRegData | AddressInfoDepData>(XAddressInfoDef);