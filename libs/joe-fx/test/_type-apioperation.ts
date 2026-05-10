import { ArrayDef, IViewElement, Setview, SetviewConstructor, Tarray, TarrayTupleItem, TupleDef } from "../src";
import { STR_ARRAY_TYPE, STR_TYPE } from "./_types";


export type ApiOperationData = (string | string[])[];
export type ApiOperationView = Setview<string | Setview<string>>;
// export type ApiOperationSetview = Setview<ApiOperationView>;

const ApiOperationDef: TupleDef = {
    type: 'array',
    title: 'apioperation_tuple',

    minlength: 3,
    maxlength: 3,
    items: [STR_TYPE, STR_TYPE, STR_ARRAY_TYPE],
    index: {
        id: ['[0]', '[1]']
    }
};



export const ApiOperationTuple = new Tarray<ApiOperationData>(ApiOperationDef);

export class ApiOperationTupleView extends Setview<string | Setview<string>> {
    constructor(array: any[], parent?: IViewElement) {
        super(array, parent, ApiOperationTuple);
        const tupleItems = ApiOperationTuple.itemsTypeDef as TarrayTupleItem;
        if (array.length === 0) {
            array.push(STR_TYPE.defaultValue());
            array.push(STR_TYPE.defaultValue());
            array.push(STR_ARRAY_TYPE.defaultValue());
        }
        this[0] = array[0];
        this[1] = array[1];
        this[2] = new Setview<string>(array[2], this, STR_ARRAY_TYPE);
    }
}
ApiOperationTuple.viewctor = ApiOperationTupleView as SetviewConstructor;

const ApiOperationListDef: ArrayDef = {
    type: 'array',
    title: 'apioperationlist_array',

    minlength: 0,
    maxlength: Number.MAX_SAFE_INTEGER,
    items: ApiOperationTuple
};

export const ApiOperationList = new Tarray<ApiOperationData>(ApiOperationListDef);
