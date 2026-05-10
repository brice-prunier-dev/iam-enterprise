import { IViewElement, ObjectDef, Objview, Setview, Tobject } from "../src";
import { ApiOperationData, ApiOperationList, ApiOperationTupleView } from "./_type-apioperation";
import { STR_TYPE } from "./_types";

export interface ApiData {
    oid: string;
    name: string;
    operations: ApiOperationData[];
}

const ApiDef: ObjectDef<ApiData> = {
    type: 'object',
    title: 'api_type',
    properties: {
        oid: STR_TYPE,
        name: STR_TYPE,
        operations: ApiOperationList
    },
    required: ['oid', 'name', 'operations'],
    index: {
        id: 'oid',
        sort: ['.>name']
    }
};
export const ApiType = new Tobject(ApiDef);
export class ApiView extends Objview<ApiData> implements ApiData {
    constructor(entity?: any, parent?: IViewElement) {
        super(ApiType, entity, parent);
    }
    declare oid: string;
    declare name: string;
    declare operations: Setview<ApiOperationTupleView>;
}
ApiType.viewctor = ApiView;
