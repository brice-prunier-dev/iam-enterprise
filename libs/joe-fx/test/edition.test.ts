import { getApi_Intact, getPerson_BP_1, getSociety_SG } from './_factories';

import { JoeLogger } from '../src';
import { SocietyType, SocietyView } from './_type-society';
import { AddressView } from './_type-adress';
import { AddressInfoDepView } from './_type-adressinfodep';
import { AddressInfoRegView } from './_type-adressinforeg';
import { ApiView } from './_type-api';
import { ApiOperationTupleView } from './_type-apioperation';
import { PersonView } from './_type-person';



describe('Joe-Fx Edition', () => {
    beforeEach(() => {
        JoeLogger.isProd = true;
    });
    
    it('New Child should be detached', () => {
        const sg = getSociety_SG();
        SocietyType.prepare(sg);
        const view = new SocietyView(sg);
        const sgNewAddress = view.addresses.$newChild<AddressView>();
        expect(sgNewAddress.$src.detached).toBeTruthy();
    });
    it('Added child path on on a setView should be its index', () => {
        const sg = getSociety_SG();
        SocietyType.prepare(sg);
        const view = new SocietyView(sg);
        const sgNewAddress = view.addresses.$newChild<AddressView>();
        sgNewAddress.$assign({
            oid: 'sg-testnew',
            kind: 'new',
            city: 'PARIS',
            num: 1,
            street: 'rue test',
            info: { departement: 'Paris'}
        });
        view.addresses.add(sgNewAddress);
        expect(sgNewAddress.$src.docPath).toBe('$>addresses>(sg-testnew)');
    });
    it('Society SG should restore initial state after cancelEdit', () => {
        const sg = getSociety_SG();
        SocietyType.prepare(sg);
        const view = new SocietyView(sg);
        const sgMainAddress = view.addresses.find((a) => a.oid === 'sg-main')!;
        const adressInfo = sgMainAddress.info as AddressInfoDepView;
        const originalDepartement = adressInfo.departement;
        adressInfo.departement = 'bibi';
        const addressCount = view.addresses.length;
        view.addresses.remove(sgMainAddress);
        const sgNewAddress = view.addresses.$newChild<AddressView>();
        sgNewAddress.$assign({
            oid: 'sg-testnew',
            kind: 'new',
            city: 'PARIS',
            num: 1,
            street: 'rue test',
            info: { departement: 'Paris'}
        });
        view.addresses.add(sgNewAddress);
        expect(view.addresses.length).toBe(addressCount);
        view.$editor!.cancelEdit();
        expect(adressInfo.departement).toBe(originalDepartement);
        expect(view.addresses.length).toBe(addressCount);
    });

    it('Person BP should restore initial state after cancelEdit', () => {
        const bp = getPerson_BP_1();
        const view = new PersonView(bp);
        const mainAddress = view.addresses.get('main');
        const adressInfo = mainAddress.info as AddressInfoRegView;
        const originalRegion = adressInfo.region;
        adressInfo.region = 'bibi';
        const addressCount = view.addresses.length;
        view.addresses.set('main', undefined);
        const newAddress = view.addresses.$newChild<AddressView>();
        newAddress.$assign({
            oid: 'sg-testnew',
            kind: 'loc',
            city: 'PARIS',
            num: 1,
            street: 'rue test',
            info: { departement: 'Paris'}
        });
        view.addresses.set('loc', newAddress);
        expect(view.addresses.length).toBe(addressCount);
        view.$editor!.cancelEdit();
        expect(adressInfo.region).toBe(originalRegion);
        expect(view.addresses.length).toBe(addressCount);
    });

    it('API should add new operation', () => {
        const api = getApi_Intact();
        const view = new ApiView(api);
        const newOperation = view.operations.$newChild<ApiOperationTupleView>();
        newOperation[0] = 'car/{id}';
        newOperation[1] = 'put';
        (newOperation[2] as unknown as string[])[0] = 'tag2';
        view.operations.add(newOperation);

        expect(view.operations.length).toBe(api.operations.length + 1);
        view.$editor!.cancelEdit();

        expect(view.operations.length).toBe(api.operations.length);
    });

    it('Assign should be the same as view', () => {
        const sg1 = getSociety_SG();
        const sg2 = getSociety_SG();

        const view1 = new SocietyView(sg1);
        const view2 = new SocietyView().$assign(sg2);

        expect(view1.addresses.length).toBe(view2.addresses.length);
        expect(view1.name.common).toBe(view2.name.common);

        const sgMainAddress1 = view1.addresses.find((a) => a.oid === 'sg-main')!;
        const sgMainAddress2 = view2.addresses.find((a) => a.oid === 'sg-main')!;
        expect(sgMainAddress1.$src.docPath).toBe(sgMainAddress2.$src.docPath);
        expect(sgMainAddress1.street).toBe(sgMainAddress2.street);
    });

    it('Assign should be the same as view with map', () => {
        const person1 = getPerson_BP_1();
        const person2 = getPerson_BP_1();

        const view1 = new PersonView(person1);
        const view2 = new PersonView().$assign(person2);

        expect(view1.addresses.length).toBe(view2.addresses.length);
        expect(view1.name.last).toBe(view2.name.last);

        const sgMainAddress1 = view1.addresses.get('main');
        const sgMainAddress2 = view2.addresses.get('main');
        expect(sgMainAddress1.$src.docPath).toBe(sgMainAddress2.$src.docPath);
        expect(sgMainAddress1.street).toBe(sgMainAddress2.street);
    });


    it('Refresh should refressh data', () => {
        const sg1 = getSociety_SG();
        const sg2 = getSociety_SG();

        sg2.name.legal = 'SG Modified',
        sg2.addresses.splice(0, 1);
        const view1 = new SocietyView(sg1);
        const oldName = view1.name.legal;
        view1.$refresh(sg2);
        expect(view1.name.legal).not.toBe(oldName);
        
        expect(view1.name.legal).toBe('SG Modified');
        expect(view1.addresses.length).toBe(sg2.addresses.length);
    });

    it('Assign should restore at same index', () => {
        const sg1 = getSociety_SG();
        const sg2 = getSociety_SG();

        const view1 = new SocietyView(sg1);
       

        const sgMainItAddress1 = view1.addresses.find((a) => a.oid === 'sg-main_it')!;
        const index1 = view1.addresses.indexOf(sgMainItAddress1);
        view1.addresses.remove( sgMainItAddress1 );
        view1.$assign(
            {
                addresses: [
                    {
                        oid: 'sg-main_it',
                        kind: 'main_it',
                        city: 'FONTENAY SOUS BOIS - 2',
                        num: 10,
                        street: 'av du val de fontenay - 2',
                        info: {
                            region: 'test'
                        }
                    }
                ]
            }
        );
        const sgMainItAddress2 = view1.addresses.find((a) => a.oid === 'sg-main_it')!;
        const index2 = view1.addresses.indexOf(sgMainItAddress2);
        expect(index2).toBe(index1);
    });
});
