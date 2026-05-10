import {getPerson_BP_1, getSociety_SG} from './_factories';
import {EStateChanges, JoeLogger} from '../src';
import {ChangeSet} from '../src';
import {SocietyType, SocietyView } from './_type-society';
import {AddressInfoDepView } from './_type-adressinfodep';
import {PersonView } from './_type-person';



describe('Joe-Fx Changeset ', () => {
    beforeEach(() => {
        JoeLogger.isProd = true;
    });

    it('Read ChangeSet after view update', () => {
        const sg = getSociety_SG();
        const view = new SocietyView(sg);
        const sgMainAddress = view.addresses.$getByIndex('sg-main')!;
        const adressInfo = sgMainAddress.info as AddressInfoDepView;
        adressInfo.departement = 'bibi';
        expect(view.$isEditing).toBeTruthy();
        const changes = [] as ChangeSet;
        view.$editor!.writeChangeSet(changes);
         expect(changes.length).toEqual(1);
        const json = view.$json();
        const sgMainAddress2 = view.addresses.$getByIndex('sg-main');
        expect(changes[0]!.path).toBe('$>addresses>(sg-main)>info');
        expect(changes[0]!.value.departement).toBe('bibi');
    });

    it('Read ChangeSet after view creation', () => {
        const bp = getPerson_BP_1();
        const view = new PersonView();
        view.$assign(bp);

        expect(view.oid).toBe(bp.oid);
        expect(view.name.first).toBe(bp.name.first);
        expect(view.name.last).toBe(bp.name.last);
        expect(view.addresses.keys().length).toBe(Object.keys(bp.addresses).length);

        const changes = [] as ChangeSet;
        view.$editor!.writeChangeSet(changes);
        expect(changes.length).toBeGreaterThan(0);
    });

    it('Re apply ChangeSet wit update', () => {
        const sg =  getSociety_SG();
        const view = new SocietyView(sg);
        const sgMainAddress = view.addresses.$getByIndex('sg-main')!;
        const adressInfo = sgMainAddress.info as AddressInfoDepView;
        adressInfo.departement = 'bibi';
        sgMainAddress.street = 'tutu';
        expect(view.$isEditing).toBeTruthy();
        view.addresses.removeAt(3);
        const changes = [] as ChangeSet;
        view.$editor!.writeChangeSet(changes);
        expect(changes.length).toEqual(3);
        const updateChange = changes.find((c) => c.path === '$>addresses>(sg-main)>info')!;
        expect(updateChange.op).toBe(EStateChanges.updated);
        expect(Object.keys(updateChange.value).length).toBe(1);
        expect(updateChange.value.departement).toBe('bibi');
        const updateChange2 = changes.find((c) => c.path === '$>addresses>(sg-main)')!;
        expect(updateChange2.op).toBe(EStateChanges.updated);
        expect(updateChange2.value.street).toBe('tutu');

        const sg2 = getSociety_SG();
        SocietyType.prepare(sg2);
        const view2 = new SocietyView(sg2);
        view2.$edit().applyChangeSet(changes);
        expect(view2.addresses.length).toBe(3);
        const sgMainAddress2 = view2.addresses.$getByIndex('sg-main')!;
        const adressInfo2 = sgMainAddress2.info as AddressInfoDepView;
        expect(adressInfo2.departement).toBe('bibi');
    });

    it('Re apply ChangeSet wit create', () => {
        const bp = getPerson_BP_1();
        const view = new PersonView();
        view.$assign(bp);

        expect(view.oid).toBe(bp.oid);
        expect(view.name.first).toBe(bp.name.first);
        expect(view.name.last).toBe(bp.name.last);
        expect(view.addresses.keys().length).toBe(Object.keys(bp.addresses).length);

        const changes = [] as ChangeSet;
        view.$editor!.writeChangeSet(changes);
        expect(changes.length).toBeGreaterThan(0);

        const view2 = new PersonView();
        view2.$edit().applyChangeSet(changes);

        expect(view2.oid).toBe(view.oid);
        expect(view2.name.first).toBe(view.name.first);
        expect(view2.name.last).toBe(view.name.last);
        expect(view2.addresses.keys().length).toBe(Object.keys(bp.addresses).length);
    });
});
