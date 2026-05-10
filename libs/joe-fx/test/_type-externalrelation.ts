
import { IViewElement, ObjectDef, Objview, Tobject } from "../src";
import { STR_TYPE } from "./_types";

export interface ExternalRelationData {
    refType: string;
    rev?: string;
    refId: string;
    path: string;
    title?: string;
}

export const ExternalRelationDef: ObjectDef<ExternalRelationData> = {
    type: 'object',
    title: 'relationdef_type',
    properties: {
        refType: STR_TYPE,
        rev: STR_TYPE,
        refId: STR_TYPE,
        path: STR_TYPE,
        title: STR_TYPE
    },
    required: ['refId', 'refType', 'path', 'title'],
    index: {
        id: 'refId',
        sort: ['title']
    }
};

export const ExternalRelationType = new Tobject(ExternalRelationDef);
export class ExternalRelationView extends Objview<ExternalRelationData> implements ExternalRelationData {
    constructor(entity?: any, parent?: IViewElement) {
        super(ExternalRelationType, entity, parent);
    }
    declare refType: string;
    declare rev?: string;
    declare refId: string;
    declare path: string;
    declare title?: string;
}
ExternalRelationType.viewctor = ExternalRelationView;