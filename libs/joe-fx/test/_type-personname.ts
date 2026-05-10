import { IViewElement, ObjectDef, Objview, Tobject } from "../src";
import { STR_TYPE } from "./_types";


export interface PersonNameData {
    first: string;
    last: string;
}

const PersonNameDef: ObjectDef<PersonNameData> = {
    type: 'object',
    title: 'personname_type',
    properties: {
        first: STR_TYPE,
        last: STR_TYPE
    },
    required: ['first', 'last'],
    index: {
        id: ['first', 'last'],
        sort: ['last', 'first']
    }
};
export const PersonNameType = new Tobject(PersonNameDef);
export class PersonNameView extends Objview<PersonNameData> implements PersonNameData {
    constructor(entity?: any, parent?: IViewElement) {
        super(PersonNameType, entity, parent);
    }
    declare first: string;
    declare last: string;
    override $asString() {
        return '' + this.first + ' ' + this.last + '.';
    }
}
PersonNameType.viewctor = PersonNameView;
