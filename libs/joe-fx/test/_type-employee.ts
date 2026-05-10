import { PersonNameData, PersonNameType } from "./_type-personname";
import { STR_TYPE } from "./_types";

export interface EmployeeData {
    oid: string;
    name: PersonNameData;
    job: string;
    addressRef: RelationLookupLocalData<AddressData>;
    societyRef: RelationLookupLocalData<SocietyNameData>;
}

const EmployeeDef: ObjectDef<EmployeeData> = {
    type: 'object',
    title: 'employee_type',
    properties: {
        oid: STR_TYPE,
        name: PersonNameType,
        job: STR_TYPE,
        addressRef: LookupLocalAddressType,
        societyRef: LookupLocalSocietyNameType
    },
    required: ['oid', 'name', 'job', 'addressRef', 'societyRef'],
    index: {
        id: 'oid',
        sort: ['@>name>last', '@>name>first']
    }
};
const EmployeeType = new Tobject(EmployeeDef);
export class EmployeeView extends Objview<EmployeeData> implements EmployeeData {
    constructor(entity?: any, parent?: IViewElement) {
        super(EmployeeType, entity, parent);
    }
    declare oid: string;
    declare name: PersonNameData;
    declare job: string;
    declare addressRef: LookupLocalAddressView;
    declare societyRef: LookupLocalSocietyNameView;
}
EmployeeType.viewctor = EmployeeView;

