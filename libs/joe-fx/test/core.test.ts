import {decodeIndexValues, isDataAssigned, JoeLogger} from '../src';
import {getApi_Intact, getSociety_SG} from './_factories';
import { ApiView } from './_type-api';
import { SocietyView } from './_type-society';


describe('Joe-Fx Core', () => {

    beforeEach(() => {
        JoeLogger.isProd = true;
    });

    it('Decode "#12, tyty, ##1.23" should return [12, "tyty", 1.23]', () => {
        const selectorValues = decodeIndexValues('#12, tyty, ##1.23');
        expect(Array.isArray(selectorValues)).toBeTruthy();
        const selectorArray = selectorValues as (string | number)[];
        expect(selectorArray[0]).toBe(12);
        expect(selectorArray[1]).toBe('tyty');
        expect(selectorArray[2]).toBe(1.23);
    });

    it('Get address by index (search on object list)', () => {
        const sg = getSociety_SG();
        const view = new SocietyView(sg);
        const sgMainAddress = view.addresses.$getByIndex('sg-main')!;
        expect(sgMainAddress.$src.docPath).toBe('$>addresses>(sg-main)');
    });

    it('Get operation by index (search on tuple list)', () => {
        const intactApi = getApi_Intact();
        const view = new ApiView(intactApi);
        const op = view.operations.$getByIndex('car/{id}', 'get')!;
        expect(op).toBeTruthy();
        const op2 = op![2]!;
        expect(op2).toBeTruthy();
        expect(op2.length).toBe(1);
        expect(op2[0]).toBe('tag2');
    });

    it('isDataAssigned object with properties', () => {
        const payload1 = {
            e2eLabelConstraint: {
                valid: false
            }
        };
        const payload2 = {
            e2eLabelConstraint: {
                valid: 1
            }
        };
        const payload3 = {
            e2eLabelConstraint: {
                valid: 'tyty'
            }
        };
        const flag1 = isDataAssigned( payload1);
        const flag2 = isDataAssigned( payload2);
        const flag3 = isDataAssigned( payload3);
        expect(flag1).toBeTruthy();
        expect(flag2).toBeTruthy();
        expect(flag3).toBeTruthy();
    });


    
});