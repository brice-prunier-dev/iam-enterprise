import { getSociety_SG } from './_factories';

import { JoeLogger, readPath, ChangeSet, splitPath, countChar } from '../src';
import { SocietyType, SocietyView } from './_type-society';
import { AddressInfoDepView } from './_type-adressinfodep';


describe('Joe-Fx XPath ', () => {
    
    beforeEach(() => {
        JoeLogger.isProd = true;
    });
   
    it('Validate "SG society" JSON obj', () => {
        const count = countChar('(prod))', ')')
        expect(count).toBe(2);
    });

    it('splitPath of "$>accounts>(tran_c, meteor, $>environments>(prod))" shold return 3 parts', () => {
        const pathParts =splitPath('$>accounts>(tran_c, meteor, $>environments>(prod))')
        expect(pathParts.length).toBe(3);
    });


    it('splitPath of "$>accounts>(tyty, tutu)>(tran_c, meteor, $>environments>(prod))>test" shold return 5 parts', () => {
        const pathParts =splitPath('$>accounts>(tyty, tutu)>(tran_c, meteor, $>environments>(prod))>test')
        expect(pathParts.length).toBe(5);
    });

    it('splitPath of "$>accounts>(tyty, tutu)>(tran_c, meteor, $>environments>(prod)>ty(ui))>test" shold return 5 parts', () => {
        const pathParts =splitPath('$>accounts>(tyty, tutu)>(tran_c, meteor, $>environments>(prod)>ty(ui))>test')
        expect(pathParts.length).toBe(5);
    });
    it('Validate "SG society" JSON obj', () => {
        const sg = getSociety_SG();
        SocietyType.prepare(sg);
        const validation = SocietyType.validate(sg);
        JoeLogger.debug(validation.errors);
        expect(validation.withError()).toBeFalsy();
    });

    it('Read "$>name>legal" on "SG society" JSON obj', () => {
        const sg = getSociety_SG();
        SocietyType.prepare(sg);
        const sgLegalName = readPath(sg, '$>name>legal');
        expect(sgLegalName).toBe('Société Générale');
    });

    it('Read addresses "sg-titre_haussman" on "SG society" JSON obj', () => {
        const sg = getSociety_SG();
        SocietyType.prepare(sg);
        const sgAddressKind = readPath(sg, '$>addresses>(sg-titre_haussman)>kind');
        expect(sgAddressKind).toBe('titre_haussman');
    });

    it('JoePointer "$>addresses>{kind: main}>city" on "SG society" Json element is correct', () => {
        const sg = getSociety_SG();
        SocietyType.prepare(sg);
        const sgAddressKind = readPath(sg, '$>addresses>{kind: main}>city');
        expect(sgAddressKind).toBe('PARIS LA DEFENSE CEDEX');
    });

    it('Update on "$>addresses>{kind: sg-main}>info" of "SG society" Json element are correctly detected', () => {
        const sg = getSociety_SG();
        SocietyType.prepare(sg);
        const view = new SocietyView(sg);
        const sgMainAddress = view.addresses.find((a) => a.oid === 'sg-main')!;
        const adressInfo = sgMainAddress.info as AddressInfoDepView;
        adressInfo.departement = 'bibi';
        expect(view.$isEditing).toBeTruthy();
        const changes: ChangeSet = [];
        view.$editor!.writeChangeSet(changes);
        expect(changes.length).toEqual(1);
        const json = view.$json();
        const sgMainAddress2 = view.addresses.find((a) => a.oid === 'sg-main')!;
        const adressInfo2 = sgMainAddress.info as AddressInfoDepView;
        expect(adressInfo2.departement).toBe('bibi');
    });

    it('"SG society" View Element has a correct path on each element', () => {
        const sg = getSociety_SG();
        const view = new SocietyView(sg);
        const sgMainAddress = view.addresses.$getByIndex('(sg-main)')!;
        expect(view.$src.path).toBe('$');
        expect(view.addresses.$src.docPath).toBe('$>addresses');
        expect(sgMainAddress.$src.docPath).toBe('$>addresses>(sg-main)');
    });

    it('ObjView with index write its path correctly: "$>addresses>(sg-main)"', () => {
        const sg = getSociety_SG();
        SocietyType.prepare(sg);
        const view = new SocietyView(sg);
        const sgMainAddress = view.addresses.find((a) => a.oid === 'sg-main')!;
        const path = sgMainAddress.$src.docPath;
        expect(path).toBe('$>addresses>(sg-main)');
    });


    it('ObjView with index write its path correctly: "$>addresses>(sg-main)"', () => {
        const sg = getSociety_SG();
        SocietyType.prepare(sg);
        const view = new SocietyView(sg);
        const sgMainAddress = view.addresses.$getByIndex('sg-main')!;
        const path = sgMainAddress.$src.docPath;
        expect(path).toBe('$>addresses>(sg-main)');
    });

    it('ObjView with index write its path correctly: "$>addresses>(sg-main)"', () => {
        const sg = getSociety_SG();
        SocietyType.prepare(sg);
        const view = new SocietyView(sg);
        const sgMainAddress = view.addresses.find((a) => a.oid === 'sg-main')!;
        const path = sgMainAddress.$src.docPath;
        expect(path).toBe('$>addresses>(sg-main)');
    });

    it('Assign should be the same as view', () => {
        const sg1 = getSociety_SG();

        const view1 = new SocietyView(sg1);

        expect(view1.addresses.$src).toBeTruthy();
        expect(view1.addresses.$src.docPath).toBe('$>addresses');

        expect(view1.name.$src).toBeTruthy();
        expect(view1.name.$src.docPath).toBe('$>name');
    });
});
