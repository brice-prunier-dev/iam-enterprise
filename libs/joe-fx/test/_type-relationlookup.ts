import { ObjectDef } from "../src";
import { ExternalRelationData, ExternalRelationDef } from "./_type-externalrelation";


export interface RelationLookupLocalData<T> extends ExternalRelationData {
    value: T;
}


export function RelationLookupLocalDefFactory<T>(
    lkpType: ObjectDef<T>
): ObjectDef<RelationLookupLocalData<T>> {
    return {
        type: 'object',
        title: 'relationlookup_' + lkpType.title,
        extends: [ExternalRelationDef],
        properties: {
            value: lkpType
        },
        required: [...ExternalRelationDef.required, 'value']
    };
}
