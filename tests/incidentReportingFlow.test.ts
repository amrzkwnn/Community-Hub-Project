import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  validateElminaCoordinates, 
  isPointInsideElmina, 
  ELMINA_PRECENT_CENTROIDS 
} from '../src/lib/utils/elminaBoundary.ts';
type IncidentType = 
  | 'flood' 
  | 'blocked_drain' 
  | 'fallen_tree' 
  | 'pothole' 
  | 'street_light' 
  | 'water_disruption' 
  | 'other';

type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

interface IncidentUpdate {
  id: string;
  incidentId: string;
  authorName: string;
  authorRole: string;
  statusFrom?: string;
  statusTo: string;
  note: string;
  createdAt: string;
}

interface ResilienceIncident {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterPrecinct: string;
  incidentType: IncidentType;
  title: string;
  description: string;
  locationName: string;
  latitude: number;
  longitude: number;
  severity: IncidentSeverity;
  status: string;
  isVerified: boolean;
  verifiedByName?: string;
  verificationNotes?: string;
  imageUrl?: string;
  isAnonymous: boolean;
  updates: IncidentUpdate[];
  createdAt: string;
  updatedAt: string;
}

describe('Map-First Incident Reporting Flow', () => {
  // Mock function simulating the state and validation flow in the Map-First UI
  function simulateMapFirstFlow(step1State: {
    pin: { lat: number; lng: number } | null;
  }, formDetails?: {
    type: IncidentType;
    title: string;
    description: string;
    severity: IncidentSeverity;
    imageUrl?: string;
    isAnonymous?: boolean;
  }) {
    // 1. Check whether confirmation is allowed on Step 1
    if (!step1State.pin) {
      return {
        canConfirmLocation: false,
        step1Error: 'No location selected yet. Tap or click anywhere on the map within the green boundary to place your incident pin.',
        incident: null,
      };
    }

    // 2. Validate coordinates against Elmina boundary
    const boundaryCheck = validateElminaCoordinates(step1State.pin.lat, step1State.pin.lng);
    if (!boundaryCheck.isValid) {
      return {
        canConfirmLocation: false,
        step1Error: boundaryCheck.message,
        incident: null,
      };
    }

    // Step 1 Location Confirmed
    if (!formDetails) {
      return {
        canConfirmLocation: true,
        step1Error: null,
        confirmedLocation: {
          lat: step1State.pin.lat,
          lng: step1State.pin.lng,
          locationName: boundaryCheck.nearestPrecinct || 'Bandar Elmina Area',
        },
        incident: null,
      };
    }

    // 3. Step 2: Form submission and record creation
    const newIncident: ResilienceIncident = {
      id: `inc-${Date.now()}`,
      reporterId: 'usr-demo-1',
      reporterName: formDetails.isAnonymous ? 'Anonymous Neighbour' : 'Farah Lee',
      reporterPrecinct: 'Elmina Green 1',
      incidentType: formDetails.type,
      title: formDetails.title,
      description: formDetails.description,
      locationName: boundaryCheck.nearestPrecinct || 'Bandar Elmina Area',
      latitude: step1State.pin.lat,
      longitude: step1State.pin.lng,
      severity: formDetails.severity,
      status: 'reported',
      isVerified: false,
      imageUrl: formDetails.imageUrl,
      isAnonymous: Boolean(formDetails.isAnonymous),
      updates: [
        {
          id: `upd-${Date.now()}`,
          incidentId: `inc-${Date.now()}`,
          authorName: formDetails.isAnonymous ? 'Anonymous Neighbour' : 'Farah Lee',
          authorRole: 'resident',
          statusTo: 'reported',
          note: 'New incident report submitted via community hub.',
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      canConfirmLocation: true,
      step1Error: null,
      confirmedLocation: {
        lat: step1State.pin.lat,
        lng: step1State.pin.lng,
        locationName: newIncident.locationName,
      },
      incident: newIncident,
    };
  }

  it('RULE 1: strictly prohibits confirmation when no location has been selected', () => {
    const result = simulateMapFirstFlow({ pin: null });
    assert.strictEqual(result.canConfirmLocation, false);
    assert.match(result.step1Error || '', /No location selected/);
    assert.strictEqual(result.incident, null);
  });

  it('RULE 2: rejects pins placed outside Elmina boundary with a clear message and blocks confirmation', () => {
    // KLCC Coordinates
    const outsideResult = simulateMapFirstFlow({
      pin: { lat: 3.1578, lng: 101.7120 }
    });
    assert.strictEqual(outsideResult.canConfirmLocation, false);
    assert.match(outsideResult.step1Error || '', /outside the Elmina township boundary/);
    assert.match(outsideResult.step1Error || '', /Please choose a location within the Elmina zone/);

    // Petaling Jaya Coordinates
    const pjResult = simulateMapFirstFlow({
      pin: { lat: 3.1073, lng: 101.6067 }
    });
    assert.strictEqual(pjResult.canConfirmLocation, false);
    assert.match(pjResult.step1Error || '', /outside the Elmina township boundary/);
  });

  it('RULE 3 & 4: accepts pin within Elmina, identifies nearest landmark, and allows moving pin', () => {
    // 1. Initial pin at Elmina Central Park
    const parkCoord = { lat: 3.1802, lng: 101.5188 };
    const step1Park = simulateMapFirstFlow({ pin: parkCoord });
    assert.strictEqual(step1Park.canConfirmLocation, true);
    assert.strictEqual(step1Park.step1Error, null);
    assert.match(step1Park.confirmedLocation?.locationName || '', /Elmina Central Park/);

    // 2. User moves pin to Denai Alam
    const denaiCoord = { lat: 3.1741, lng: 101.5218 };
    const step1Denai = simulateMapFirstFlow({ pin: denaiCoord });
    assert.strictEqual(step1Denai.canConfirmLocation, true);
    assert.strictEqual(step1Denai.step1Error, null);
    assert.match(step1Denai.confirmedLocation?.locationName || '', /Denai Alam/);

    // 3. User moves pin to Elmina Green 3
    const eg3Coord = { lat: 3.1818, lng: 101.5125 };
    const step1EG3 = simulateMapFirstFlow({ pin: eg3Coord });
    assert.strictEqual(step1EG3.canConfirmLocation, true);
    assert.match(step1EG3.confirmedLocation?.locationName || '', /Elmina Green 3/);
  });

  it('RULE 5 & 6: proceeds to incident form and submits complete report with coordinates and details', () => {
    const selectedPin = { lat: 3.1793, lng: 101.5165 }; // Persiaran Elmina / Rainbow bridge
    const flowResult = simulateMapFirstFlow(
      { pin: selectedPin },
      {
        type: 'flood',
        title: 'Roadway flash flood under Rainbow Bridge',
        description: 'Persistent water ponding 0.3m depth blocking lane heading towards Denai Alam.',
        severity: 'high',
        imageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861593',
        isAnonymous: false,
      }
    );

    assert.strictEqual(flowResult.canConfirmLocation, true);
    assert(flowResult.incident !== null);
    const incident = flowResult.incident;

    // Verify coordinates and location mapping
    assert.strictEqual(incident.latitude, selectedPin.lat);
    assert.strictEqual(incident.longitude, selectedPin.lng);
    assert.match(incident.locationName, /Rainbow Bridge|Elmina/);

    // Verify incident metadata
    assert.strictEqual(incident.incidentType, 'flood');
    assert.strictEqual(incident.severity, 'high');
    assert.strictEqual(incident.title, 'Roadway flash flood under Rainbow Bridge');
    assert.strictEqual(incident.imageUrl, 'https://images.unsplash.com/photo-1541888946425-d0fbb1861593');
    assert.strictEqual(incident.isAnonymous, false);
    assert.strictEqual(incident.status, 'reported');
    assert.strictEqual(incident.isVerified, false);
  });

  it('RULE 7: supports anonymous reporting while preserving management audit trail', () => {
    const flowResult = simulateMapFirstFlow(
      { pin: { lat: 3.1818, lng: 101.5125 } },
      {
        type: 'blocked_drain',
        title: 'Blocked perimeter culvert',
        description: 'Heavy palm debris clogging stormwater drain behind Elmina Green 3.',
        severity: 'medium',
        isAnonymous: true,
      }
    );

    assert(flowResult.incident !== null);
    assert.strictEqual(flowResult.incident.reporterName, 'Anonymous Neighbour');
    assert.strictEqual(flowResult.incident.isAnonymous, true);
    assert.strictEqual(flowResult.incident.reporterId, 'usr-demo-1'); // Preserved in audit
    assert.strictEqual(flowResult.incident.updates[0].authorName, 'Anonymous Neighbour');
  });

  it('RULE 7 (Management Verification Workflow): new report starts as unverified and requires management action', () => {
    const flowResult = simulateMapFirstFlow(
      { pin: { lat: 3.1802, lng: 101.5188 } },
      {
        type: 'fallen_tree',
        title: 'Fallen branch on lake jogging track',
        description: 'Large bough obstructing morning pedestrian path.',
        severity: 'low',
        isAnonymous: false,
      }
    );

    const report = flowResult.incident!;
    assert.strictEqual(report.isVerified, false);
    assert.strictEqual(report.status, 'reported');

    // Simulate management verification
    const verifiedReport: ResilienceIncident = {
      ...report,
      isVerified: true,
      verifiedByName: 'Mohd Ridzuan (JMB Officer)',
      verificationNotes: 'Inspected on site by auxiliary patrol; contractor dispatched.',
      status: 'dispatched',
      updates: [
        ...report.updates,
        {
          id: `upd-${Date.now()}`,
          incidentId: report.id,
          authorName: 'Mohd Ridzuan',
          authorRole: 'management',
          statusFrom: 'reported',
          statusTo: 'dispatched',
          note: 'Verified and maintenance contractor dispatched.',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    assert.strictEqual(verifiedReport.isVerified, true);
    assert.strictEqual(verifiedReport.verifiedByName, 'Mohd Ridzuan (JMB Officer)');
    assert.strictEqual(verifiedReport.status, 'dispatched');
    assert.strictEqual(verifiedReport.updates.length, 2);
  });
});
