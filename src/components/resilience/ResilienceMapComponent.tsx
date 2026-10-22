'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ResilienceIncident } from '@/types';
import { ELMINA_BOUNDARY_POLYGON } from '@/lib/utils/elminaBoundary';
import type * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ResilienceMapComponentProps {
  incidents: ResilienceIncident[];
  onSelectIncident?: (incident: ResilienceIncident) => void;
  center?: [number, number];
  zoom?: number;
  isPinPlacementMode?: boolean;
  placementPin?: { lat: number; lng: number } | null;
  onPlacementPinChange?: (lat: number, lng: number) => void;
  heightClass?: string;
  showExistingIncidents?: boolean;
  promptBannerText?: string;
  selectedIncidentId?: string | null;
}

export default function ResilienceMapComponent({
  incidents,
  onSelectIncident,
  center = [3.1802, 101.5165], // Bandar Elmina Central coordinates
  zoom = 14,
  isPinPlacementMode = false,
  placementPin = null,
  onPlacementPinChange,
  heightClass = 'h-[540px]',
  showExistingIncidents = true,
  promptBannerText,
  selectedIncidentId,
}: ResilienceMapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const placementMarkerRef = useRef<L.Marker | null>(null);
  const wetlandPolygonRef = useRef<L.Polygon | null>(null);
  const patrolPolylineRef = useRef<L.Polyline | null>(null);
  const onPlacementPinChangeRef = useRef(onPlacementPinChange);

  // Floating layer toggle states (Matching Stitch flagship screen)
  const [showWetlandLayer, setShowWetlandLayer] = useState(true);
  const [showPatrolZones, setShowPatrolZones] = useState(false);

  useEffect(() => {
    onPlacementPinChangeRef.current = onPlacementPinChange;
  }, [onPlacementPinChange]);

  // Floating map zoom & recenter control handlers
  const handleZoomIn = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  }, []);

  const handleRecenter = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([3.1802, 101.5165], 14, { animate: true });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let resizeObserver: ResizeObserver | null = null;
    let timer1: NodeJS.Timeout | null = null;
    let timer2: NodeJS.Timeout | null = null;

    async function initMap() {
      if (!mapContainerRef.current) return;
      const Leaflet = (await import('leaflet')).default;

      if (!mapInstanceRef.current && isMounted) {
        const map = Leaflet.map(mapContainerRef.current, {
          tapHold: true,
          zoomControl: false, // Use Stitch custom controls
        }).setView(center, zoom);

        Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Sime Darby Property Elmina GIS v4.2',
        }).addTo(map);

        // Draw Elmina Township Boundary Demarcation (Dashed Coral Line matching Stitch)
        const boundaryPolygon = Leaflet.polygon(
          ELMINA_BOUNDARY_POLYGON.map(([lat, lng]) => [lat, lng] as [number, number]),
          {
            color: '#ba1b1d', // Primary red boundary line
            weight: 2.2,
            opacity: 0.85,
            fillColor: '#9E1315',
            fillOpacity: 0.04,
            dashArray: '8, 6',
          }
        ).addTo(map);

        boundaryPolygon.bindTooltip('City of Elmina Township Boundary Demarcation (3,000 ac)', {
          sticky: true,
          className: 'elmina-boundary-tooltip',
        });

        // Ensure clicking anywhere on boundary or base map triggers pin placement
        boundaryPolygon.on('click', (e: L.LeafletMouseEvent) => {
          if (onPlacementPinChangeRef.current) {
            onPlacementPinChangeRef.current(e.latlng.lat, e.latlng.lng);
          }
        });

        map.on('click', (e: L.LeafletMouseEvent) => {
          if (onPlacementPinChangeRef.current) {
            onPlacementPinChangeRef.current(e.latlng.lat, e.latlng.lng);
          }
        });

        // Create Central Park Wetland Layer
        const wetlandCoords: [number, number][] = [
          [3.1825, 101.5135],
          [3.1855, 101.5175],
          [3.1830, 101.5210],
          [3.1785, 101.5160],
          [3.1800, 101.5130],
        ];
        const wetlandPoly = Leaflet.polygon(wetlandCoords, {
          color: '#0284c7',
          weight: 1.5,
          opacity: 0.9,
          fillColor: '#bfdbfe',
          fillOpacity: 0.45,
        });
        wetlandPoly.bindTooltip('Elmina Wetland & Lake Hydrology Basin (Retention Safe 78%)', { sticky: true });
        wetlandPolygonRef.current = wetlandPoly;
        if (showWetlandLayer) {
          wetlandPoly.addTo(map);
        }

        // Create Auxiliary Police Patrol Spine
        const patrolCoords: [number, number][] = [
          [3.1700, 101.5050],
          [3.1780, 101.5140],
          [3.1850, 101.5220],
          [3.1930, 101.5300],
        ];
        const patrolLine = Leaflet.polyline(patrolCoords, {
          color: '#9E1315',
          weight: 4,
          opacity: 0.7,
          dashArray: '10, 6',
        });
        patrolLine.bindTooltip('Auxiliary Police Rapid Patrol Sector Spine', { sticky: true });
        patrolPolylineRef.current = patrolLine;
        if (showPatrolZones) {
          patrolLine.addTo(map);
        }

        mapInstanceRef.current = map;

        // Force resize recalculation to ensure tiles fill container
        map.invalidateSize();
        timer1 = setTimeout(() => map.invalidateSize(), 150);
        timer2 = setTimeout(() => map.invalidateSize(), 400);

        if (mapContainerRef.current) {
          resizeObserver = new ResizeObserver(() => {
            map.invalidateSize();
          });
          resizeObserver.observe(mapContainerRef.current);
        }
      }

      const map = mapInstanceRef.current;
      if (!map) return;

      // Smoothly pan when center coordinates change
      if (center) {
        const currentCenter = map.getCenter();
        if (Math.abs(currentCenter.lat - center[0]) > 0.0001 || Math.abs(currentCenter.lng - center[1]) > 0.0001) {
          map.setView(center, zoom || map.getZoom(), { animate: true });
        }
      }

      // Update layer visibility
      if (wetlandPolygonRef.current) {
        if (showWetlandLayer && !map.hasLayer(wetlandPolygonRef.current)) {
          wetlandPolygonRef.current.addTo(map);
        } else if (!showWetlandLayer && map.hasLayer(wetlandPolygonRef.current)) {
          map.removeLayer(wetlandPolygonRef.current);
        }
      }

      if (patrolPolylineRef.current) {
        if (showPatrolZones && !map.hasLayer(patrolPolylineRef.current)) {
          patrolPolylineRef.current.addTo(map);
        } else if (!showPatrolZones && map.hasLayer(patrolPolylineRef.current)) {
          map.removeLayer(patrolPolylineRef.current);
        }
      }

      // Clear existing incident markers (preserve tile layer & boundary)
      map.eachLayer((layer: L.Layer) => {
        if (
          layer instanceof Leaflet.Marker &&
          layer !== placementMarkerRef.current
        ) {
          map.removeLayer(layer);
        }
      });

      // Add Draggable Target Placement Marker if active (Step 2 of Stitch flow)
      if (placementPin) {
        if (!placementMarkerRef.current) {
          const pinIcon = Leaflet.divIcon({
            className: 'stitch-placement-div-icon',
            html: `
              <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: grab;">
                <span style="position: absolute; top: -6px; width: 48px; height: 48px; border-radius: 50%; border: 2px dashed #9E1315; background: rgba(158,19,21,0.2); animation: ping 1.8s infinite;"></span>
                <div style="
                  width: 42px;
                  height: 42px;
                  border-radius: 50%;
                  background: #9E1315;
                  border: 3px solid white;
                  box-shadow: 0 6px 18px rgba(158,19,21,0.45);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  position: relative;
                  z-index: 2;
                ">
                  <span class="material-symbols-outlined" style="font-size: 24px; line-height: 1;">crisis_alert</span>
                </div>
                <div style="
                  margin-top: 4px;
                  padding: 2px 8px;
                  border-radius: 6px;
                  background: #9E1315;
                  color: white;
                  font-family: Inter, sans-serif;
                  font-size: 11px;
                  font-weight: 700;
                  white-space: nowrap;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                  z-index: 3;
                ">
                  Target Pin
                </div>
              </div>
            `,
            iconSize: [42, 64],
            iconAnchor: [21, 42],
          });

          const newPlacement = Leaflet.marker([placementPin.lat, placementPin.lng], {
            icon: pinIcon,
            draggable: true,
            title: 'Selected Incident Location (Drag or click map to move)',
          }).addTo(map);

          newPlacement.on('dragend', (e: L.DragEndEvent) => {
            const target = e.target as L.Marker;
            const pos = target.getLatLng();
            if (onPlacementPinChangeRef.current) {
              onPlacementPinChangeRef.current(pos.lat, pos.lng);
            }
          });

          placementMarkerRef.current = newPlacement;
        } else {
          placementMarkerRef.current.setLatLng([placementPin.lat, placementPin.lng]);
        }
      } else if (placementMarkerRef.current) {
        map.removeLayer(placementMarkerRef.current);
        placementMarkerRef.current = null;
      }

      // Add Stitch-styled markers for existing active incidents
      if (showExistingIncidents) {
        incidents.forEach((inc) => {
          const isSelected = selectedIncidentId === inc.id;
          const isResolved = inc.status === 'resolved';

          const getMarkerColor = (severity: string, status: string) => {
            if (status === 'resolved') return '#10b981';
            if (severity === 'critical') return '#9E1315';
            if (severity === 'high') return '#ea580c';
            if (severity === 'medium') return '#d97706';
            return '#0284c7';
          };

          const getMaterialSymbol = (type: string) => {
            switch (type) {
              case 'fallen_tree':
                return 'park';
              case 'flood':
                return 'water_damage';
              case 'blocked_drain':
                return 'waves';
              case 'lighting':
                return 'lightbulb';
              case 'road_hazard':
                return 'minor_crash';
              case 'animals':
                return 'pets';
              case 'security':
                return 'local_police';
              default:
                return 'warning';
            }
          };

          const color = getMarkerColor(inc.severity, inc.status);
          const symbol = getMaterialSymbol(inc.incidentType);
          const isCritical = inc.severity === 'critical' && !isResolved;
          const refCode = inc.id.startsWith('inc-')
            ? 'ELM-' + (parseInt(inc.id.replace('inc-', '')) + 880)
            : inc.id.slice(-6).toUpperCase();

          const customIcon = Leaflet.divIcon({
            className: 'stitch-resilience-marker',
            html: `
              <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: ${isSelected ? 'scale(1.18)' : 'scale(1)'}; transition: transform 0.15s ease;">
                ${isCritical ? `
                  <span style="position: absolute; top: -2px; width: 44px; height: 44px; border-radius: 50%; background: rgba(158,19,21,0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
                ` : ''}
                <div style="
                  width: 38px; 
                  height: 38px; 
                  background: ${color}; 
                  border: ${isSelected ? '3.5px solid #ffffff' : '2.5px solid #ffffff'}; 
                  border-radius: 50%; 
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                  box-shadow: ${isSelected ? '0 6px 20px rgba(0,0,0,0.45)' : '0 4px 12px rgba(0,0,0,0.25)'};
                  color: white;
                  position: relative;
                  z-index: 2;
                ">
                  <span class="material-symbols-outlined" style="font-size: 20px; line-height: 1;">${symbol}</span>
                  ${inc.isVerified ? `
                    <span style="
                      position: absolute;
                      top: -3px;
                      right: -3px;
                      background: #00468f;
                      color: white;
                      width: 16px;
                      height: 16px;
                      border-radius: 50%;
                      border: 2px solid white;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 9px;
                      font-weight: 900;
                      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                    " title="Verified by Management">✓</span>
                  ` : ''}
                </div>
                <div style="
                  margin-top: 3px;
                  padding: 2px 6px;
                  border-radius: 4px;
                  background: ${isSelected ? '#9E1315' : 'rgba(25, 28, 30, 0.9)'};
                  color: white;
                  font-family: Inter, sans-serif;
                  font-size: 10px;
                  font-weight: 700;
                  white-space: nowrap;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.25);
                  z-index: 3;
                ">
                  #${refCode}
                </div>
              </div>
            `,
            iconSize: [40, 58],
            iconAnchor: [20, 20],
          });

          const marker = Leaflet.marker([inc.latitude, inc.longitude], { icon: customIcon }).addTo(map);

          if (onSelectIncident) {
            marker.on('click', () => {
              onSelectIncident(inc);
            });
          }

          marker.bindTooltip(`
            <div style="font-family: Inter, sans-serif; font-size: 11px;">
              <strong>#${refCode}</strong> • ${inc.title}
              <div style="color: #64748b; font-size: 10px;">${inc.locationName}</div>
            </div>
          `, { sticky: true, offset: [0, -15] });
        });
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (timer1) clearTimeout(timer1);
      if (timer2) clearTimeout(timer2);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        placementMarkerRef.current = null;
      }
    };
  }, [incidents, center, zoom, placementPin, showExistingIncidents, onSelectIncident, showWetlandLayer, showPatrolZones, selectedIncidentId]);

  return (
    <div className={`relative w-full ${heightClass} rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 dark:border-slate-800 shadow-md touch-manipulation select-none group`}>
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Floating Map Zoom & Recenter Navigation Controls (Bottom-Left, Stitch flagship) */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-1 bg-white/95 dark:bg-[#15181C]/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-slate-200/80 dark:border-slate-800">
        <button 
          type="button"
          onClick={handleZoomIn} 
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95" 
          title="Zoom in"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
        </button>
        <div className="h-[1px] bg-slate-200 dark:bg-slate-800 w-full" />
        <button 
          type="button"
          onClick={handleZoomOut} 
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95" 
          title="Zoom out"
        >
          <span className="material-symbols-outlined text-[18px]">remove</span>
        </button>
        <div className="h-[1px] bg-slate-200 dark:bg-slate-800 w-full" />
        <button 
          type="button"
          onClick={handleRecenter} 
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9E1315] hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer active:scale-95" 
          title="Re-center City of Elmina"
        >
          <span className="material-symbols-outlined text-[18px]">my_location</span>
        </button>
      </div>

      {/* Floating Map Layer Toggles (Top-Right, Stitch flagship) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-white/95 dark:bg-[#15181C]/95 backdrop-blur-md px-2 py-1.5 rounded-xl shadow-md border border-slate-200/80 dark:border-slate-800 text-xs">
        <button 
          type="button"
          onClick={() => setShowWetlandLayer((prev) => !prev)}
          className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-all cursor-pointer ${
            showWetlandLayer 
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800' 
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">water</span>
          <span>Wetland Layer</span>
        </button>
        <button 
          type="button"
          onClick={() => setShowPatrolZones((prev) => !prev)}
          className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-all cursor-pointer ${
            showPatrolZones 
              ? 'bg-rose-50 dark:bg-rose-950/60 text-[#9E1315] dark:text-rose-300 font-semibold border border-rose-200 dark:border-rose-800' 
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">local_police</span>
          <span>Aux Patrol Zones</span>
        </button>
      </div>

      {/* Pin placement instructions banner */}
      {promptBannerText && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-slate-900/90 text-white px-4 py-2 rounded-full shadow-lg border border-white/20 text-xs font-bold flex items-center gap-2 backdrop-blur-md">
          <span>{promptBannerText}</span>
        </div>
      )}
    </div>
  );
}

