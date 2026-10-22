'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '@/lib/context/AppContext';
import { ResilienceIncident, IncidentType, IncidentSeverity, IncidentStatus } from '@/types';
import { validateElminaCoordinates, ELMINA_PRECENT_CENTROIDS } from '@/lib/utils/elminaBoundary';
import { 
  MapPin, 
  ListFilter, 
  Plus, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Droplet, 
  Trees, 
  Trash2, 
  SunMedium, 
  Info, 
  Check, 
  ShieldCheck, 
  Camera, 
  ArrowLeft, 
  ArrowRight,
  Archive,
  History,
  Phone,
  Sparkles,
  ExternalLink,
  Navigation,
  Layers
} from 'lucide-react';
import TimeAgo from '@/components/common/TimeAgo';

// Dynamically import map component to avoid SSR window issues
const ResilienceMapComponent = dynamic(
  () => import('./ResilienceMapComponent'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-[540px] bg-slate-100 dark:bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-slate-400 animate-pulse border border-slate-200/80 dark:border-slate-800">
        <MapPin className="w-8 h-8 mb-2 text-[#9E1315]" />
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Loading Elmina Resilience Map...</span>
        <span className="text-xs text-slate-400 mt-0.5">Sime Darby GIS v4.2 Hydrology & Incident Telemetry</span>
      </div>
    )
  }
);

interface PrecinctPill {
  id: string;
  label: string;
  lat: number;
  lng: number;
  zoom?: number;
}

const PRECINCT_PILLS: PrecinctPill[] = [
  { id: 'all', label: 'All Elmina (3,000 ac)', lat: 3.1802, lng: 101.5165, zoom: 14 },
  { id: 'central_park', label: 'Central Park (300 ac)', lat: 3.1802, lng: 101.5188, zoom: 15 },
  { id: 'elmina_valley', label: 'Elmina Valley 1-5', lat: 3.1785, lng: 101.5190, zoom: 15 },
  { id: 'elmina_green', label: 'Elmina Green', lat: 3.1812, lng: 101.5142, zoom: 15 },
  { id: 'ilham', label: 'Ilham Residence', lat: 3.1760, lng: 101.5080, zoom: 15 },
  { id: 'denai_alam', label: 'Denai Alam', lat: 3.1741, lng: 101.5218, zoom: 15 },
  { id: 'lakeside_mall', label: 'Lakeside Mall Zone', lat: 3.1820, lng: 101.5205, zoom: 16 },
];

export default function ResilienceView() {
  const { 
    incidents, 
    reportIncident, 
    updateIncidentStatus, 
    verifyIncident,
    rejectIncident,
    archiveIncident,
    setActiveTab,
    t, 
    currentUser,
    navigationTarget,
    clearNavigationTarget
  } = useApp();

  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedIncident, setSelectedIncident] = useState<ResilienceIncident | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterVerification, setFilterVerification] = useState<string>('all');
  const [selectedPrecinct, setSelectedPrecinct] = useState<string>('all');
  const [mapCenter, setMapCenter] = useState<[number, number]>([3.1802, 101.5165]);
  const [mapZoom, setMapZoom] = useState<number>(14);

  // Success Toast state (Section 14.A confirmation toast)
  const [submissionToast, setSubmissionToast] = useState<string | null>(null);

  // Archiving confirmation state
  const [archiveConfirmModal, setArchiveConfirmModal] = useState<ResilienceIncident | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  
  // Custom Map-First Incident Reporting Flow (Matching Stitch Step 1-3)
  const [isReportingPinMode, setIsReportingPinMode] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [placementPin, setPlacementPin] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocationValid, setIsLocationValid] = useState(false);
  const [coordError, setCoordError] = useState<string | null>(null);

  // Form Fields
  const [newType, setNewType] = useState<IncidentType>('fallen_tree');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [newSeverity, setNewSeverity] = useState<IncidentSeverity>('medium');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newAnonymous, setNewAnonymous] = useState(false);

  // Duplicate Warning State
  const [duplicateWarning, setDuplicateWarning] = useState<ResilienceIncident | null>(null);

  // Management Verification & Status Update in Master Card
  const [managementNote, setManagementNote] = useState('');
  const [assignedTeamInput, setAssignedTeamInput] = useState('');
  const [newStatusSelect, setNewStatusSelect] = useState<IncidentStatus>('dispatched');
  const [verifyNotesInput, setVerifyNotesInput] = useState('Verified via on-site patrol / telemetry sensor.');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const isStaff = currentUser.role === 'management' || currentUser.role === 'security';
  const isManagement = currentUser.role === 'management';

  // Lock background scroll when modal is open
  useEffect(() => {
    const isAnyModalOpen = isReportModalOpen || Boolean(archiveConfirmModal);
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsReportModalOpen(false);
        setArchiveConfirmModal(null);
        setIsReportingPinMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isReportModalOpen, archiveConfirmModal]);

  // Handle pin placement or movement on map
  const handlePlacementPinChange = useCallback((lat: number, lng: number, overrideLocationName?: string) => {
    const validation = validateElminaCoordinates(lat, lng);
    setPlacementPin({ lat, lng });

    if (!validation.isValid) {
      setIsLocationValid(false);
      setCoordError(validation.message || 'Selected location is outside the Elmina township boundary.');
    } else {
      setIsLocationValid(true);
      setCoordError(null);
      setNewLocationName(overrideLocationName || validation.nearestPrecinct || 'Bandar Elmina Area');
    }
  }, []);

  // Deep Navigation Listener for Global Search and AI Assistant
  useEffect(() => {
    if (!navigationTarget || navigationTarget.tab !== 'resilience') return;
    let timer: NodeJS.Timeout | null = null;

    if (navigationTarget.action === 'report_incident') {
      timer = setTimeout(() => {
        setIsReportingPinMode(true);
        setViewMode('map');
        if (navigationTarget.prefill) {
          const pf = navigationTarget.prefill;
          if (pf.category) setNewType(pf.category);
          if (pf.title) setNewTitle(pf.title);
          if (pf.description) setNewDesc(pf.description);
          if (pf.latitude && pf.longitude) {
            setMapCenter([pf.latitude, pf.longitude]);
            setMapZoom(16);
            handlePlacementPinChange(pf.latitude, pf.longitude, pf.locationName);
          } else {
            handlePlacementPinChange(3.1802, 101.5165, pf.locationName);
          }
        }
        clearNavigationTarget();
      }, 0);
    } else if (navigationTarget.itemId) {
      const inc = incidents.find((i) => i.id === navigationTarget.itemId);
      if (inc) {
        timer = setTimeout(() => {
          setSearchQuery('');
          setFilterCategory('all');
          setFilterSeverity('all');
          setFilterVerification('all');
          setSelectedPrecinct('all');
          setSelectedIncident(inc);
          setMapCenter([inc.latitude, inc.longitude]);
          setMapZoom(16);
          clearNavigationTarget();
        }, 0);
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [navigationTarget, incidents, clearNavigationTarget, handlePlacementPinChange]);

  // Set default selected incident if none selected
  useEffect(() => {
    if (!selectedIncident && incidents.length > 0) {
      const activeFirst = incidents.find((i) => !i.isArchived);
      if (activeFirst) {
        setSelectedIncident(activeFirst);
      }
    }
  }, [incidents, selectedIncident]);

  // Filtered incidents calculation
  const filteredIncidents = incidents.filter((inc) => {
    if (inc.isArchived) return false;
    
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const refCode = `#elm-${inc.id.slice(0, 4).toLowerCase()}`;
      const matchesSearch = 
        inc.title.toLowerCase().includes(q) ||
        inc.description.toLowerCase().includes(q) ||
        inc.locationName.toLowerCase().includes(q) ||
        refCode.includes(q);
      if (!matchesSearch) return false;
    }

    // Category filter
    if (filterCategory !== 'all') {
      if (filterCategory === 'flood' && inc.incidentType !== 'flood') return false;
      if (filterCategory === 'fallen_tree' && inc.incidentType !== 'fallen_tree') return false;
      if (filterCategory === 'blocked_drain' && inc.incidentType !== 'blocked_drain') return false;
      if (filterCategory === 'street_light' && inc.incidentType !== 'street_light') return false;
      if (filterCategory === 'pothole' && inc.incidentType !== 'pothole') return false;
      if (filterCategory === 'water_disruption' && inc.incidentType !== 'water_disruption') return false;
      if (filterCategory === 'other' && inc.incidentType !== 'other') return false;
    }

    // Severity filter
    if (filterSeverity !== 'all' && inc.severity !== filterSeverity) return false;

    // Verification filter
    if (filterVerification === 'verified' && !inc.isVerified) return false;
    if (filterVerification === 'community' && inc.isVerified) return false;

    // Precinct filter
    if (selectedPrecinct !== 'all') {
      const p = selectedPrecinct.toLowerCase();
      const loc = inc.locationName.toLowerCase();
      if (p === 'central_park' && !loc.includes('park') && !loc.includes('lake')) return false;
      if (p === 'elmina_valley' && !loc.includes('valley')) return false;
      if (p === 'elmina_green' && !loc.includes('green')) return false;
      if (p === 'ilham' && !loc.includes('ilham')) return false;
      if (p === 'denai_alam' && !loc.includes('denai')) return false;
      if (p === 'lakeside_mall' && !loc.includes('mall') && !loc.includes('lakeside')) return false;
    }

    return true;
  });

  // Open Map-First reporting flow (Step 1: Map Picker)
  const handleOpenReportModal = () => {
    setIsReportingPinMode(true);
    setViewMode('map');
    // Pre-seed center pin if none exists
    const initialLat = 3.1802;
    const initialLng = 101.5165;
    handlePlacementPinChange(initialLat, initialLng);
  };


  const handleSelectPrecinctPill = (pill: PrecinctPill) => {
    setSelectedPrecinct(pill.id);
    setMapCenter([pill.lat, pill.lng]);
    if (pill.zoom) setMapZoom(pill.zoom);
  };

  // Optional image file upload
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setNewImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placementPin || !isLocationValid) {
      setCoordError('Please select a valid incident location within the Elmina boundary.');
      setIsReportingPinMode(true);
      setIsReportModalOpen(false);
      return;
    }
    if (!newTitle.trim() || !newDesc.trim()) return;

    // Validate coordinates against Elmina township boundary
    const validation = validateElminaCoordinates(placementPin.lat, placementPin.lng);
    if (!validation.isValid) {
      setIsLocationValid(false);
      setCoordError(validation.message || 'Coordinates are outside the Elmina township boundary.');
      setIsReportingPinMode(true);
      setIsReportModalOpen(false);
      return;
    }

    const result = await reportIncident({
      incidentType: newType,
      title: newTitle.trim(),
      description: newDesc.trim(),
      locationName: newLocationName.trim() || validation.nearestPrecinct || 'Bandar Elmina Area',
      latitude: placementPin.lat,
      longitude: placementPin.lng,
      severity: newSeverity,
      imageUrl: newImageUrl.trim() || undefined,
      isAnonymous: newAnonymous,
    });

    if (result.error) {
      setCoordError(result.error);
      setIsReportingPinMode(true);
      setIsReportModalOpen(false);
      return;
    }

    if (result.isDuplicate && result.duplicateOf) {
      setDuplicateWarning(result.duplicateOf);
    }

    // Reset and close modal
    setIsReportModalOpen(false);
    setIsReportingPinMode(false);
    setPlacementPin(null);
    setIsLocationValid(false);
    setNewTitle('');
    setNewDesc('');
    setNewImageUrl('');
    
    // Set success toast matching Stitch Step 5
    const refCode = result.incident ? `#ELM-${result.incident.id.slice(0, 4)}` : '#ELM-889';
    setSubmissionToast(`Dispatched to Elmina Auxiliary Police & Sime Darby Township Operations Desk. Ref ${refCode}.`);
    setTimeout(() => {
      setSubmissionToast(null);
    }, 6000);

    // Focus on new incident on the map
    setViewMode('map');
    if (result.incident) {
      setSelectedIncident(result.incident);
      setMapCenter([result.incident.latitude, result.incident.longitude]);
    }
  };

  const handleVerifyIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;

    const res = await verifyIncident(selectedIncident.id, verifyNotesInput);
    if (res.success) {
      setActionSuccess('Incident verified and broadcast as official Auxiliary Police alert.');
      const updated = incidents.find((i) => i.id === selectedIncident.id);
      if (updated) setSelectedIncident({ ...updated, isVerified: true, verifiedByName: currentUser.fullName });
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  const handleRejectIncident = async () => {
    if (!selectedIncident) return;
    await rejectIncident(selectedIncident.id, 'Declined after on-site patrol inspection');
    setActionSuccess('Incident report declined.');
    setTimeout(() => {
      setSelectedIncident(null);
      setActionSuccess(null);
    }, 1500);
  };

  const handleExecuteArchive = async () => {
    if (!archiveConfirmModal) return;
    setIsArchiving(true);
    const res = await archiveIncident(archiveConfirmModal.id);
    setIsArchiving(false);
    if (res.success) {
      setActionSuccess(`Incident "${archiveConfirmModal.title}" successfully archived from active maps.`);
      setArchiveConfirmModal(null);
      setSelectedIncident(null);
      setTimeout(() => setActionSuccess(null), 4000);
    } else {
      alert(res.error || 'Failed to archive incident.');
    }
  };

  const handleStatusUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !managementNote.trim()) return;

    updateIncidentStatus(
      selectedIncident.id,
      newStatusSelect,
      managementNote,
      assignedTeamInput.trim() || undefined
    );

    setManagementNote('');
    const updated = incidents.find((i) => i.id === selectedIncident.id);
    if (updated) setSelectedIncident(updated);
  };

  const getIncidentIcon = (type: IncidentType) => {
    switch (type) {
      case 'flood':
        return <Droplet className="w-4 h-4 text-sky-600" />;
      case 'fallen_tree':
        return <Trees className="w-4 h-4 text-emerald-700" />;
      case 'blocked_drain':
        return <Trash2 className="w-4 h-4 text-amber-700" />;
      default:
        return <SunMedium className="w-4 h-4 text-orange-600" />;
    }
  };

  const getSeverityBadge = (sev: IncidentSeverity) => {
    switch (sev) {
      case 'critical':
        return { label: 'Critical (Immediate)', class: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800' };
      case 'high':
        return { label: 'High Urgency', class: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300 dark:border-orange-800' };
      case 'medium':
        return { label: 'Medium Attention', class: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800' };
      default:
        return { label: 'Low Priority', class: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300 dark:border-sky-800' };
    }
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case 'resolved':
        return { label: 'Resolved', class: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' };
      case 'dispatched':
        return { label: 'En Route / Dispatched', class: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300' };
      case 'under_review':
        return { label: 'Under Review', class: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300' };
      default:
        return { label: 'Reported', class: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300' };
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto px-4 sm:px-8 py-6 space-y-6 text-slate-800 dark:text-slate-100 select-none">
      {/* 1. Page Header & Action Bar (Matching Stitch Flagship) */}
      <div className="w-full">
        {/* Header Title & Primary Action Cluster */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Resilience Map
            </h1>
          </div>

          {/* Action Cluster */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* Map / List Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'map'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">map</span>
                <span>Map View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
                <span>List</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                  {filteredIncidents.length}
                </span>
              </button>
            </div>

            {/* Management Archive History CTA */}
            {isManagement && (
              <button
                type="button"
                onClick={() => setActiveTab('management')}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 font-semibold px-3.5 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                title="Management Incident Archive History"
              >
                <Archive className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Archived ({incidents.filter((i) => i.isArchived).length})</span>
              </button>
            )}

            {/* Primary Report Incident CTA */}
            <button
              type="button"
              onClick={handleOpenReportModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ba1b1d] hover:bg-[#94000c] text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-98 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_alert</span>
              <span>+ Report Incident</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Search, Dropdown Filters & Boundary Pills Card (Matching Stitch) */}
      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-white dark:bg-[#15181C] border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[20px]">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by precinct, street or incident ID (e.g. #ELM-884)..."
              className="w-full h-10 pl-10 pr-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9E1315]/20 focus:border-[#9E1315]"
            />
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#9E1315]/20"
            >
              <option value="all">All Incident Categories</option>
              <option value="fallen_tree">Fallen Tree & Trail Obstruction</option>
              <option value="flood">Drainage & Hydrology / Flood</option>
              <option value="blocked_drain">Blocked Drain / Waste</option>
              <option value="street_light">Street & Park Lighting Outage</option>
              <option value="pothole">Road Surface & Pavement Hazard</option>
              <option value="water_disruption">Water Supply Disruption</option>
              <option value="other">Other Township Hazards</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div className="md:col-span-2">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#9E1315]/20"
            >
              <option value="all">Any Severity</option>
              <option value="critical">Critical (Immediate)</option>
              <option value="high">High Urgency</option>
              <option value="medium">Medium Attention</option>
              <option value="low">Low Priority</option>
            </select>
          </div>

          {/* Verification Dropdown */}
          <div className="md:col-span-2">
            <select
              value={filterVerification}
              onChange={(e) => setFilterVerification(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#9E1315]/20"
            >
              <option value="all">All Dispatches</option>
              <option value="verified">Verified by Mgmt</option>
              <option value="community">Resident Logs Only</option>
            </select>
          </div>
        </div>

        {/* Township Boundary Quick-Filters (Precinct Pills) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 scrollbar-none text-xs">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mr-1 shrink-0">
            Precinct:
          </span>
          {PRECINCT_PILLS.map((pill) => {
            const isActive = selectedPrecinct === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => handleSelectPrecinctPill(pill)}
                className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#ba1b1d] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Step 2 Pinpoint Dropper Banner (Interactive Reporting Mode) */}
      {isReportingPinMode && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-100 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px] text-blue-600 dark:text-blue-400 animate-bounce">
              pin_drop
            </span>
            <div>
              <div className="font-bold text-sm leading-tight">Step 2: Pinpoint Incident Location</div>
              <div className="text-xs text-blue-700 dark:text-blue-300">
                Click anywhere on the Elmina vector map or drag the target crosshair to set GPS location.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsReportingPinMode(false)}
            className="text-blue-700 dark:text-blue-300 hover:text-blue-950 dark:hover:text-white p-1 rounded-lg cursor-pointer"
            title="Cancel incident reporting"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      )}

      {/* 4. Submission Success Banner / Toast (Matching Stitch Step 5) */}
      {submissionToast && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-700 text-white shadow-xl animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px] text-white">thumb_up</span>
            </div>
            <div>
              <div className="font-bold text-sm">Incident Report Logged Successfully!</div>
              <div className="text-xs text-emerald-100">{submissionToast}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSubmissionToast(null)}
            className="text-emerald-200 hover:text-white p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Duplicate Warning Alert */}
      {duplicateWarning && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-800 rounded-2xl p-4 text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong className="block text-xs font-bold uppercase tracking-wider">
                Notice: Similar Incident Already Active Nearby
              </strong>
              <p className="text-xs text-amber-900 dark:text-amber-300 mt-0.5">
                Report &quot;{duplicateWarning.title}&quot; at {duplicateWarning.locationName} is already recorded and assigned to teams.
              </p>
            </div>
          </div>
          <button
            onClick={() => setDuplicateWarning(null)}
            className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 5. Main Map & Selected Incident Detail Split Grid (8 Cols / 4 Cols) */}
      {viewMode === 'map' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Map Canvas Workspace (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col gap-2">
            <div className="relative w-full rounded-2xl overflow-hidden shadow-md">
              <ResilienceMapComponent
                incidents={filteredIncidents}
                selectedIncidentId={selectedIncident?.id}
                onSelectIncident={(inc) => setSelectedIncident(inc)}
                center={mapCenter}
                zoom={mapZoom}
                heightClass="h-[540px]"
                isPinPlacementMode={isReportingPinMode}
                placementPin={isReportingPinMode ? placementPin : null}
                onPlacementPinChange={handlePlacementPinChange}
              />

              {/* Floating Step 3 Location Confirmation Card on Map (Matching Stitch Step 3) */}
              {isReportingPinMode && placementPin && isLocationValid && (
                <div className="absolute bottom-4 right-4 z-30 p-4 rounded-2xl bg-white/95 dark:bg-[#15181C]/95 backdrop-blur-md shadow-2xl max-w-xs border-t-4 border-[#ba1b1d] border-x border-b border-slate-200/80 dark:border-slate-800 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-[#ba1b1d] text-[18px]">location_on</span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">Location Confirmed</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                    {newLocationName || 'Bandar Elmina Area'} (GPS: {placementPin.lat.toFixed(4)}° N, {placementPin.lng.toFixed(4)}° E).
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsReportingPinMode(false);
                        setIsReportModalOpen(true);
                      }}
                      className="flex-1 py-1.5 rounded-xl bg-[#ba1b1d] hover:bg-[#94000c] text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                    >
                      Confirm & Details
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsReportingPinMode(false);
                        setPlacementPin(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Map Legend & GIS Telemetry Bar (Matching Stitch) */}
            <div className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-white dark:bg-[#15181C] border border-slate-200/80 dark:border-slate-800 shadow-xs text-xs text-slate-600 dark:text-slate-400 gap-2">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px]">Legend:</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#9E1315] animate-ping" />
                  <span>Critical / Flood Danger</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Medium / Attention</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] font-bold">✓</span>
                  <span>Auxiliary Police Verified</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-400">
                Active Map Telemetry: Sime Darby GIS v4.2
              </div>
            </div>
          </div>

          {/* Selected Incident Details Panel (4 Cols, Matching Stitch Master Card) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {selectedIncident ? (
              <div className="p-5 rounded-2xl bg-white dark:bg-[#15181C] shadow-md flex flex-col gap-4 border-t-4 border-[#9E1315] border-x border-b border-slate-200/80 dark:border-slate-800">
                {/* Top Status & ID Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-bold text-slate-900 dark:text-white">
                        #ELM-{selectedIncident.id.slice(0, 4)}
                      </span>
                      {selectedIncident.isVerified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          Verified by Ops
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Reported <TimeAgo date={selectedIncident.createdAt} /> • {selectedIncident.locationName}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 border ${getSeverityBadge(selectedIncident.severity).class}`}>
                    {getSeverityBadge(selectedIncident.severity).label.split(' ')[0]}
                  </span>
                </div>

                {/* Incident Headline & Situation */}
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {selectedIncident.title}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {selectedIncident.description}
                  </p>
                </div>

                {/* Photographic Evidence */}
                {selectedIncident.imageUrl ? (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-800 shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedIncident.imageUrl}
                      alt={selectedIncident.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] backdrop-blur-sm">
                      Photo logged by Resident • <TimeAgo date={selectedIncident.createdAt} />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                    No photographic evidence attached
                  </div>
                )}

                {/* Live Resolution Workflow Timeline (Matching Stitch) */}
                <div className="flex flex-col gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Live Resolution Workflow
                  </span>
                  <div className="relative pl-6 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800">
                    {/* Step 1: Report Logged */}
                    <div className="relative">
                      <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                      <div className="text-xs text-slate-900 dark:text-white font-semibold leading-tight">
                        Report Logged by Verified Resident
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(selectedIncident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Verified GIS telemetry coordinates
                      </div>
                    </div>

                    {/* Step 2: Auxiliary Police Inspection */}
                    <div className="relative">
                      <span className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        selectedIncident.isVerified || selectedIncident.status === 'dispatched' || selectedIncident.status === 'resolved'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}>
                        {selectedIncident.isVerified ? '✓' : '•'}
                      </span>
                      <div className="text-xs text-slate-900 dark:text-white font-semibold leading-tight">
                        Auxiliary Police Inspection & Cordon
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {selectedIncident.isVerified 
                          ? `Officer on site • ${selectedIncident.verifiedByName || 'Unit 2'}`
                          : 'Pending on-site inspection'}
                      </div>
                    </div>

                    {/* Step 3: Response Team En Route */}
                    <div className="relative">
                      <span className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        selectedIncident.status === 'dispatched'
                          ? 'bg-[#ba1b1d] text-white animate-pulse'
                          : selectedIncident.status === 'resolved'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}>
                        {selectedIncident.status === 'resolved' ? '✓' : selectedIncident.status === 'dispatched' ? '●' : '•'}
                      </span>
                      <div className={`text-xs font-semibold leading-tight ${selectedIncident.status === 'dispatched' ? 'text-[#ba1b1d] dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                        Response Team En Route / On-Site
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {selectedIncident.status === 'dispatched'
                          ? 'Dispatched • Contractor crew assigned'
                          : selectedIncident.status === 'resolved'
                          ? 'Action completed'
                          : 'Pending dispatch'}
                      </div>
                    </div>

                    {/* Step 4: Site Cleared & Reopened */}
                    <div className={`relative ${selectedIncident.status !== 'resolved' ? 'opacity-50' : ''}`}>
                      <span className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        selectedIncident.status === 'resolved' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                      }`}>
                        {selectedIncident.status === 'resolved' ? '✓' : ''}
                      </span>
                      <div className="text-xs text-slate-900 dark:text-white font-semibold leading-tight">
                        Site Cleared & Reopened
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {selectedIncident.status === 'resolved' ? 'Confirmed by Township Ops' : 'Pending contractor confirmation'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Staff Actions (Verification & Status Update) */}
                {isStaff && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-[#ba1b1d]" />
                        <span>Township Management Actions</span>
                      </span>
                      {isManagement && !selectedIncident.isVerified && (
                        <button
                          type="button"
                          onClick={handleRejectIncident}
                          className="text-rose-600 hover:text-rose-700 text-[11px] font-semibold cursor-pointer"
                        >
                          Decline
                        </button>
                      )}
                    </div>

                    {/* Verification Button (if unverified and user is management) */}
                    {isManagement && !selectedIncident.isVerified && (
                      <button
                        type="button"
                        onClick={handleVerifyIncident}
                        className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verify & Broadcast Blue Alert</span>
                      </button>
                    )}

                    {/* Status updater */}
                    <form onSubmit={handleStatusUpdate} className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={newStatusSelect}
                          onChange={(e) => setNewStatusSelect(e.target.value as IncidentStatus)}
                          className="w-full text-xs p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        >
                          <option value="under_review">Under Review</option>
                          <option value="dispatched">Dispatched</option>
                          <option value="resolved">Resolved</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Team / Contractor"
                          value={assignedTeamInput}
                          onChange={(e) => setAssignedTeamInput(e.target.value)}
                          className="w-full text-xs p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Audit note (e.g. crew cleared drain obstruction)"
                        value={managementNote}
                        onChange={(e) => setManagementNote(e.target.value)}
                        className="w-full text-xs p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                      <button
                        type="submit"
                        className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Save Action & Log Audit
                      </button>
                    </form>

                    {/* Soft Archive for Resolved Incident */}
                    {isManagement && selectedIncident.status === 'resolved' && (
                      <button
                        type="button"
                        onClick={() => setArchiveConfirmModal(selectedIncident)}
                        className="w-full py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Archive Resolved Incident</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Citizen Emergency Hotline Callout (Matching Stitch) */}
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-between text-rose-950 dark:text-rose-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#ba1b1d] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-[18px]">call</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold">Auxiliary Police Control</div>
                      <div className="text-[11px] text-[#ba1b1d] dark:text-rose-300 font-medium">24/7 Rapid Response Desk</div>
                    </div>
                  </div>
                  <a
                    href="tel:0378452222"
                    className="px-3 py-1.5 rounded-lg bg-[#ba1b1d] hover:bg-[#94000c] text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    03-7845 2222
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-white dark:bg-[#15181C] border border-slate-200/80 dark:border-slate-800 shadow-xs text-center flex flex-col items-center justify-center min-h-[300px]">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[24px]">pin_drop</span>
                </div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No Incident Selected</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
                  Select any incident marker on the map to inspect live GIS telemetry, verification status, and the resolution workflow timeline.
                </p>
                {filteredIncidents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIncident(filteredIncidents[0])}
                    className="mt-4 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    View Latest Incident ({filteredIncidents[0].title.slice(0, 24)}...)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* List View (Matching Stitch Design) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIncidents.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-[#15181C] rounded-2xl p-12 text-center text-slate-400 border border-slate-200/80 dark:border-slate-800">
              <MapPin className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#ba1b1d]" />
              <p className="text-sm font-semibold">No incidents found matching current filters.</p>
            </div>
          ) : (
            filteredIncidents.map((inc) => {
              const sevBadge = getSeverityBadge(inc.severity);
              const statBadge = getStatusBadge(inc.status);
              return (
                <div
                  key={inc.id}
                  onClick={() => {
                    setSelectedIncident(inc);
                    setViewMode('map');
                    setMapCenter([inc.latitude, inc.longitude]);
                  }}
                  className="bg-white dark:bg-[#15181C] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-[#ba1b1d] dark:hover:border-rose-500 hover:shadow-md transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                        {getIncidentIcon(inc.incidentType)}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sevBadge.class}`}>
                        {sevBadge.label.split(' ')[0]}
                      </span>
                      {inc.isVerified && (
                        <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-blue-200 dark:border-blue-800">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          <span>VERIFIED</span>
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statBadge.class}`}>
                      {statBadge.label}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1 leading-snug">
                      {inc.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {inc.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="truncate max-w-[180px]">📍 {inc.locationName}</span>
                    <span><TimeAgo date={inc.createdAt} /></span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 6. High-Fidelity Incident Reporting Modal (Matching Stitch Flagship) */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#15181C] shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ba1b1d] text-[22px]">report_problem</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Submit Community Incident</h3>
              </div>
              <button 
                type="button"
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                onClick={() => setIsReportModalOpen(false)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleReportSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto">
              {/* Selected Geo Location Chip */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <span className="material-symbols-outlined text-[#ba1b1d] text-[18px]">location_on</span>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {newLocationName || 'Bandar Elmina Area'}
                  </span>
                </div>
                {placementPin && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono shrink-0">
                    {placementPin.lat.toFixed(4)}° N, {placementPin.lng.toFixed(4)}° E
                  </span>
                )}
              </div>

              {/* Title input */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Report Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Fallen branch snapped near jogging track lamp #EV2-044"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9E1315]/20 focus:border-[#9E1315]"
                />
              </div>

              {/* Incident Category Selector (2-col radio grid) */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Category <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'fallen_tree', label: 'Fallen Tree / Trail', icon: 'park' },
                    { id: 'flood', label: 'Drainage / Hydrology', icon: 'water_damage' },
                    { id: 'street_light', label: 'Lighting Outage', icon: 'lightbulb' },
                    { id: 'pothole', label: 'Road / Kerb Hazard', icon: 'minor_crash' },
                  ].map((cat) => (
                    <label 
                      key={cat.id}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                        newType === cat.id
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-[#ba1b1d] text-slate-900 dark:text-white font-semibold'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="incident_category"
                        checked={newType === cat.id}
                        onChange={() => setNewType(cat.id as IncidentType)}
                        className="accent-[#ba1b1d]"
                      />
                      <span className="material-symbols-outlined text-[16px] text-[#ba1b1d]">{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Severity Level Buttons */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Severity Level <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {(['low', 'medium', 'high', 'critical'] as IncidentSeverity[]).map((sev) => {
                    const isSelected = newSeverity === sev;
                    return (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setNewSeverity(sev)}
                        className={`py-2 rounded-xl text-center capitalize font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? sev === 'critical'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : sev === 'high'
                              ? 'bg-orange-600 text-white shadow-xs'
                              : sev === 'medium'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-sky-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {sev}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description & Hazard Details Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Description & Hazard Details <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Provide context to assist township patrol officers and maintenance teams..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9E1315]/20 focus:border-[#9E1315] resize-none"
                />
              </div>

              {/* Upload Photo Proof Zone */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Upload Photo Proof
                </label>
                <label className="h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors">
                  <span className="material-symbols-outlined text-[24px] text-slate-400">add_a_photo</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Tap to capture or attach image (JPG, PNG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageFileUpload}
                  />
                </label>
                {newImageUrl && (
                  <div className="relative inline-block mt-2 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={newImageUrl}
                      alt="Incident proof"
                      className="h-20 w-auto object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setNewImageUrl('')}
                      className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white text-[10px] rounded-full p-1 leading-none cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Verified Resident Checkbox */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-[18px]">verified_user</span>
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      Post as Verified Resident
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {currentUser.fullName} ({currentUser.townshipPrecinct} Verified Resident)
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={!newAnonymous}
                  onChange={(e) => setNewAnonymous(!e.target.checked)}
                  className="w-4 h-4 accent-[#ba1b1d] rounded cursor-pointer"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#ba1b1d] hover:bg-[#94000c] text-white text-xs font-bold shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* 8. Archive Incident Confirmation Modal (Requirement 1: Soft-deletion policy) */}
      {archiveConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#15181C] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center mx-auto shadow-inner">
              <Archive className="w-6 h-6" />
            </div>
            
            <div className="text-center space-y-1.5">
              <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Archive Resolved Incident?
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Are you sure you want to archive <strong>&ldquo;{archiveConfirmModal.title}&rdquo;</strong>?
              </p>
            </div>

            <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5 leading-relaxed">
              <div className="font-bold text-slate-800 dark:text-white text-xs">Soft Deletion & Preservation Policy:</div>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">✓</span>
                <span>Removed from active map pins and public incident feeds</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">✓</span>
                <span>Never permanently deleted; preserved with full Supabase history</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">✓</span>
                <span>Searchable and reviewable in Management Incident History</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setArchiveConfirmModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteArchive}
                disabled={isArchiving}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{isArchiving ? 'Archiving Incident...' : 'Confirm Archiving'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
