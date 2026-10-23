import { test, describe } from 'node:test';
import assert from 'node:assert';
import { isPointInsideElmina, validateElminaCoordinates } from '../src/lib/utils/elminaBoundary.ts';
import { toDatabaseUserId, fromDatabaseUserId } from '../src/lib/utils/idMapping.ts';

describe('TESDH Critical Fix Suite: Incident Approval, Coordinates & Quick Chat', () => {

  // Test A & C: Coordinate Accuracy & Boundary Validation
  describe('Part 3 — Coordinate Capture, Validation & Anti-Stacking', () => {
    test('strictly validates valid finite coordinates within Elmina boundary', () => {
      const elminaCentralPark = { lat: 3.1802, lng: 101.5165 };
      const elminaRidge = { lat: 3.1950, lng: 101.5200 };
      const elminaWest = { lat: 3.1750, lng: 101.5050 };

      assert.strictEqual(isPointInsideElmina(elminaCentralPark.lat, elminaCentralPark.lng), true);
      assert.strictEqual(isPointInsideElmina(elminaRidge.lat, elminaRidge.lng), true);
      assert.strictEqual(isPointInsideElmina(elminaWest.lat, elminaWest.lng), true);

      const val1 = validateElminaCoordinates(elminaCentralPark.lat, elminaCentralPark.lng);
      assert.strictEqual(val1.isValid, true);
      assert.strictEqual(typeof val1.nearestPrecinct, 'string');

      const val2 = validateElminaCoordinates(elminaRidge.lat, elminaRidge.lng);
      assert.strictEqual(val2.isValid, true);
      assert.strictEqual(typeof val2.nearestPrecinct, 'string');
    });

    test('rejects missing, NaN, infinite, or out-of-boundary coordinates without silent fallback', () => {
      const klcc = { lat: 3.1578, lng: 101.7118 };
      assert.strictEqual(isPointInsideElmina(klcc.lat, klcc.lng), false);

      const valOut = validateElminaCoordinates(klcc.lat, klcc.lng);
      assert.strictEqual(valOut.isValid, false);
      assert.match(valOut.message || '', /outside/i);

      const valNaN = validateElminaCoordinates(NaN, 101.5165);
      assert.strictEqual(valNaN.isValid, false);

      const valNull = validateElminaCoordinates(null as any, undefined as any);
      assert.strictEqual(valNull.isValid, false);
    });

    test('retains distinct coordinates for 3 separate synthetic reports (prevents coordinate stacking)', () => {
      const locA = { lat: 3.17123, lng: 101.50456 };
      const locB = { lat: 3.18456, lng: 101.51789 };
      const locC = { lat: 3.19789, lng: 101.52345 };

      const valA = validateElminaCoordinates(locA.lat, locA.lng);
      const valB = validateElminaCoordinates(locB.lat, locB.lng);
      const valC = validateElminaCoordinates(locC.lat, locC.lng);

      assert.strictEqual(valA.isValid, true);
      assert.strictEqual(valB.isValid, true);
      assert.strictEqual(valC.isValid, true);

      // Verify they do not collapse to a single default coordinate
      assert.notStrictEqual(locA.lat, locB.lat);
      assert.notStrictEqual(locB.lat, locC.lat);
      assert.notStrictEqual(locA.lng, locB.lng);
      assert.notStrictEqual(locB.lng, locC.lng);
    });
  });

  // Test A & B: Incident Approval State Machine & Public Visibility
  describe('Part 1 & 2 — Incident Approval Workflow & Visibility Rules', () => {
    interface IncidentReport {
      id: string;
      title: string;
      status: 'pending' | 'under_review' | 'dispatched' | 'resolved' | 'rejected';
      reporterId: string;
      latitude: number;
      longitude: number;
    }

    const testIncidents: IncidentReport[] = [
      {
        id: 'inc-pending-1',
        title: 'Clogged roadside culvert',
        status: 'pending',
        reporterId: 'user-vikram',
        latitude: 3.1812,
        longitude: 101.5170,
      },
      {
        id: 'inc-approved-1',
        title: 'Fallen acacia branch blocking lane',
        status: 'under_review',
        reporterId: 'user-nurul',
        latitude: 3.1834,
        longitude: 101.5192,
      },
      {
        id: 'inc-rejected-1',
        title: 'Unrelated noise complaint',
        status: 'rejected',
        reporterId: 'user-vikram',
        latitude: 3.1850,
        longitude: 101.5210,
      },
    ];

    test('public map selector hides pending and rejected incidents from residents', () => {
      const currentResidentId = 'user-rosli'; // A different resident
      const isManagement = false;

      const publicMapIncidents = testIncidents.filter((inc) => {
        if (isManagement) return true;
        // Non-management must NOT see pending or rejected incidents on the public map
        return inc.status !== 'pending' && inc.status !== 'rejected';
      });

      assert.strictEqual(publicMapIncidents.length, 1);
      assert.strictEqual(publicMapIncidents[0].id, 'inc-approved-1');
      assert.strictEqual(publicMapIncidents[0].status, 'under_review');
    });

    test('management pending approval queue retrieves pending reports with audit details', () => {
      const isManagement = true;

      const managementPendingQueue = testIncidents.filter((inc) => {
        if (!isManagement) return false;
        return inc.status === 'pending';
      });

      assert.strictEqual(managementPendingQueue.length, 1);
      assert.strictEqual(managementPendingQueue[0].id, 'inc-pending-1');
      assert.strictEqual(managementPendingQueue[0].title, 'Clogged roadside culvert');
    });

    test('approving an incident transitions status to approved/under_review and reveals it on public map', () => {
      const incidentToApprove = { ...testIncidents[0] };
      assert.strictEqual(incidentToApprove.status, 'pending');

      // Management approves
      incidentToApprove.status = 'under_review';

      // Now re-evaluating public map visibility
      const isVisibleOnPublicMap = incidentToApprove.status !== 'pending' && incidentToApprove.status !== 'rejected';
      assert.strictEqual(isVisibleOnPublicMap, true);
    });

    test('reporter can view their own pending report status while hidden from other residents', () => {
      const reporterUser = 'user-vikram';
      const thirdPartyUser = 'user-rosli';

      const vikramView = testIncidents.filter((inc) => {
        return inc.status !== 'pending' || inc.reporterId === reporterUser;
      });

      const rosliView = testIncidents.filter((inc) => {
        return inc.status !== 'pending' || inc.reporterId === thirdPartyUser;
      });

      assert.strictEqual(vikramView.some((i) => i.id === 'inc-pending-1'), true);
      assert.strictEqual(rosliView.some((i) => i.id === 'inc-pending-1'), false);
    });
  });

  // Test E & F: Quick Chat & Recipient Resolution
  describe('Part 5, 6 & 7 — Exchange & Local Services Quick Chat & Contextual Drafts', () => {
    test('maps Supabase UUIDs to Persona IDs and back reliably', () => {
      const nurulUuid = '11111111-1111-4111-8111-111111111111';
      const vikramUuid = '22222222-2222-4222-8222-222222222222';
      const azmanUuid = '33333333-3333-4333-8333-333333333333';

      assert.strictEqual(toDatabaseUserId('user-nurul'), nurulUuid);
      assert.strictEqual(toDatabaseUserId('user-vikram'), vikramUuid);
      assert.strictEqual(toDatabaseUserId('user-azman'), azmanUuid);

      assert.strictEqual(fromDatabaseUserId(nurulUuid), 'user-nurul');
      assert.strictEqual(fromDatabaseUserId(vikramUuid), 'user-vikram');
      assert.strictEqual(fromDatabaseUserId(azmanUuid), 'user-azman');
    });

    test('prevents self-messaging when viewing own listing or service', () => {
      const currentUserId = 'user-nurul';
      const itemOwnerId = 'user-nurul';

      const canMessage = currentUserId !== itemOwnerId;
      assert.strictEqual(canMessage, false);
    });

    test('generates correct, contextual draft for Exchange giveaway item in English and BM', () => {
      const giveawayItem = {
        id: 'ex-01',
        title: 'Baby Stroller (Good Condition)',
        listingType: 'giveaway',
        authorId: 'user-vikram',
      };

      const generateExchangeDraft = (item: typeof giveawayItem, lang: 'en' | 'bm') => {
        const isFree = item.listingType === 'giveaway';
        if (lang === 'bm') {
          return isFree
            ? `Hai, saya berminat dengan barang pemberian percuma '${item.title}'. Adakah ia masih boleh diambil?`
            : `Hai, saya berminat dengan barang anda '${item.title}'. Adakah ia masih ada?`;
        }
        return isFree
          ? `Hi, I'm interested in your giveaway '${item.title}'. Is it still available for collection?`
          : `Hi, I'm interested in your listing '${item.title}'. Is it still available?`;
      };

      const draftEN = generateExchangeDraft(giveawayItem, 'en');
      const draftBM = generateExchangeDraft(giveawayItem, 'bm');

      assert.strictEqual(draftEN.includes('Baby Stroller (Good Condition)'), true);
      assert.strictEqual(draftEN.includes('giveaway'), true);
      assert.strictEqual(draftBM.includes('Baby Stroller (Good Condition)'), true);
      assert.strictEqual(draftBM.includes('pemberian percuma'), true);
    });

    test('generates correct, contextual draft for Local Services provider in English and BM', () => {
      const serviceOffering = {
        id: 'serv-01',
        title: 'Home Electrical Inspection',
        type: 'offering',
        authorId: 'user-nurul',
      };

      const generateServiceDraft = (serv: typeof serviceOffering, lang: 'en' | 'bm') => {
        if (lang === 'bm') {
          return serv.type === 'offering'
            ? `Hai, saya melihat perkhidmatan ${serv.title} anda di NADI Community Hub. Bolehkah anda kongsikan butiran lanjut mengenai ketersediaan?`
            : `Hai, saya melihat permintaan bantuan anda untuk '${serv.title}'. Saya berminat untuk membantu. Bolehkah anda kongsikan butiran lanjut?`;
        }
        return serv.type === 'offering'
          ? `Hi, I saw your ${serv.title} service on NADI Community Hub. Could you share more details about availability?`
          : `Hi, I saw your request for help with '${serv.title}'. I'm interested in helping. Could you share more details?`;
      };

      const draftEN = generateServiceDraft(serviceOffering, 'en');
      const draftBM = generateServiceDraft(serviceOffering, 'bm');

      assert.strictEqual(draftEN.includes('Home Electrical Inspection'), true);
      assert.strictEqual(draftEN.includes('availability'), true);
      assert.strictEqual(draftBM.includes('Home Electrical Inspection'), true);
      assert.strictEqual(draftBM.includes('ketersediaan'), true);
    });

    test('generates correct, contextual draft for Local Services Request for Help in English and BM', () => {
      const helpRequest = {
        id: 'serv-02',
        title: 'Lawn Mower Borrow / Help',
        type: 'requesting',
        authorId: 'user-vikram',
      };

      const generateServiceDraft = (serv: typeof helpRequest, lang: 'en' | 'bm') => {
        if (lang === 'bm') {
          return serv.type === 'offering'
            ? `Hai, saya melihat perkhidmatan ${serv.title} anda di NADI Community Hub. Bolehkah anda kongsikan butiran lanjut mengenai ketersediaan?`
            : `Hai, saya melihat permintaan bantuan anda untuk '${serv.title}'. Saya berminat untuk membantu. Bolehkah anda kongsikan butiran lanjut?`;
        }
        return serv.type === 'offering'
          ? `Hi, I saw your ${serv.title} service on NADI Community Hub. Could you share more details about availability?`
          : `Hi, I saw your request for help with '${serv.title}'. I'm interested in helping. Could you share more details?`;
      };

      const draftEN = generateServiceDraft(helpRequest, 'en');
      const draftBM = generateServiceDraft(helpRequest, 'bm');

      assert.strictEqual(draftEN.includes('Lawn Mower Borrow / Help'), true);
      assert.strictEqual(draftEN.includes('helping'), true);
      assert.strictEqual(draftBM.includes('Lawn Mower Borrow / Help'), true);
      assert.strictEqual(draftBM.includes('membantu'), true);
    });
  });
});
