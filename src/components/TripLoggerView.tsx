import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  DollarSign,
  Plus,
  Navigation,
  Car,
  Tag,
  MapPin,
  FileCheck,
} from 'lucide-react';
import { Trip, TripCategory, VehicleProfile } from '../types/vehicle';
import { getStandardMileageRate } from '../engine/irsCalculator';

interface TripLoggerViewProps {
  profile: VehicleProfile;
  lastTripEndOdometer?: number;
  onSaveTrip: (trip: Omit<Trip, 'id' | 'createdAt'>) => void;
  onDone?: () => void;
}

interface TripFormErrors {
  destination?: string;
  startOdo?: string;
  endOdo?: string;
  businessPurpose?: string;
}

const PURPOSE_PRESETS = [
  'Client consultation and on-site architecture review',
  'Pickup office and ministry equipment, supplies, and staging cables',
  'Client production site maintenance & deployment',
  'Industry tech conference and continuing professional education',
  'Airport transportation for visiting client team',
  'Offsite business strategy and stakeholder planning session',
];

export const TripLoggerView: React.FC<TripLoggerViewProps> = ({
  profile,
  lastTripEndOdometer,
  onSaveTrip,
  onDone,
}) => {
  const defaultStart = lastTripEndOdometer || profile.currentOdometer;
  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState<string>(todayStr);
  const [startOdo, setStartOdo] = useState<number>(defaultStart);
  const [endOdo, setEndOdo] = useState<number>(defaultStart + 15);
  const [distance, setDistance] = useState<number>(15);
  const [category, setCategory] = useState<TripCategory>('BUSINESS');
  const [destination, setDestination] = useState<string>('');
  const [businessPurpose, setBusinessPurpose] = useState<string>('');
  const [tollsAndParking, setTollsAndParking] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errors, setErrors] = useState<TripFormErrors>({});

  const destinationRef = useRef<HTMLInputElement>(null);
  const startOdoRef = useRef<HTMLInputElement>(null);
  const endOdoRef = useRef<HTMLInputElement>(null);
  const businessPurposeRef = useRef<HTMLTextAreaElement>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the success-toast timeout if the view unmounts mid-message.
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const clearError = (field: keyof TripFormErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const tripYear = parseInt(date.split('-')[0], 10) || new Date().getFullYear();
  const rate = getStandardMileageRate(tripYear);

  // Auto calculate when Start or End change
  const handleStartChange = (val: number) => {
    setStartOdo(val);
    setDistance(Math.max(0, endOdo - val));
    clearError('startOdo');
    clearError('endOdo');
  };

  const handleEndChange = (val: number) => {
    setEndOdo(val);
    setDistance(Math.max(0, val - startOdo));
    clearError('startOdo');
    clearError('endOdo');
  };

  const handleDistanceChange = (val: number) => {
    setDistance(val);
    setEndOdo(startOdo + val);
    clearError('startOdo');
    clearError('endOdo');
  };

  const handleCategoryChange = (cat: TripCategory) => {
    setCategory(cat);
    if (cat !== 'BUSINESS') clearError('businessPurpose');
  };

  // Statutory IRC § 274 Check
  const isBusiness = category === 'BUSINESS';
  const hasValidPurpose = !isBusiness || businessPurpose.trim().length >= 5;
  const hasValidDest = destination.trim().length > 0;
  const hasValidOdo = startOdo > 0 && endOdo >= startOdo;
  const isCompliant = hasValidPurpose && hasValidDest && hasValidOdo;

  const estimatedMileageDeduction = isBusiness ? distance * rate : 0;
  const estimatedTotalDeduction = isBusiness ? estimatedMileageDeduction + (tollsAndParking || 0) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: TripFormErrors = {};
    if (!destination.trim()) {
      nextErrors.destination = 'Please enter a destination.';
    }
    if (startOdo <= 0) {
      nextErrors.startOdo = 'Start odometer must be greater than 0.';
    }
    if (endOdo < startOdo) {
      nextErrors.endOdo = 'End odometer must be greater than or equal to the start odometer.';
    }
    if (isBusiness && businessPurpose.trim().length < 5) {
      nextErrors.businessPurpose =
        'IRC § 274 requires an explicit business purpose (at least 5 characters) for business mileage deductions.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      if (nextErrors.destination) {
        destinationRef.current?.focus();
      } else if (nextErrors.startOdo) {
        startOdoRef.current?.focus();
      } else if (nextErrors.endOdo) {
        endOdoRef.current?.focus();
      } else if (nextErrors.businessPurpose) {
        businessPurposeRef.current?.focus();
      }
      return;
    }

    setErrors({});

    onSaveTrip({
      date,
      startOdometer: startOdo,
      endOdometer: endOdo,
      distanceMiles: distance,
      category,
      destination: destination.trim(),
      businessPurpose: businessPurpose.trim(),
      tollsAndParkingUsd: Number(tollsAndParking) || 0,
      notes: notes.trim(),
    });

    setSuccessMsg(`Logged trip of ${distance} miles to ${destination.trim()}!`);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => {
      setSuccessMsg('');
      successTimerRef.current = null;
      if (onDone) onDone();
    }, 1500);

    // Reset for next trip
    setStartOdo(endOdo);
    setEndOdo(endOdo + 15);
    setDistance(15);
    setDestination('');
    setBusinessPurpose('');
    setTollsAndParking(0);
    setNotes('');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Title & Statutory Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600/15 px-2.5 py-1 text-xs font-semibold text-blue-400 border border-blue-500/30">
          <FileCheck className="w-4 h-4" aria-hidden="true" /> IRC § 274(d) Contemporaneous Mileage Log
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
          Record New Trip
        </h2>
        <p className="text-xs text-slate-400">
          Maintains strict IRS audit compliance with odometer readings, business purpose, and separate tolls tracking.
        </p>
      </div>

      <div role="status" aria-live="polite" aria-atomic="true">
        {successMsg && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-3 text-xs font-semibold text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            {successMsg}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 shadow-xl backdrop-blur-md">
        {/* Category Pill Selector */}
        <fieldset className="border-0 p-0 min-w-0">
          <legend className="block text-xs font-medium text-slate-300 mb-2">
            Trip Classification
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {(['BUSINESS', 'COMMUTE', 'PERSONAL'] as TripCategory[]).map((cat) => {
              const isSelected = category === cat;
              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  aria-pressed={isSelected}
                  className={`rounded-xl py-2.5 px-3 text-xs font-semibold transition-all flex flex-col items-center justify-center gap-0.5 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isSelected
                      ? cat === 'BUSINESS'
                        ? 'border-blue-500 bg-blue-600/20 text-blue-300 shadow-sm'
                        : cat === 'COMMUTE'
                        ? 'border-amber-500 bg-amber-600/20 text-amber-300'
                        : 'border-slate-500 bg-slate-700/50 text-slate-200'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span>{cat}</span>
                  <span className="text-[10px] font-normal opacity-75">
                    {cat === 'BUSINESS'
                      ? 'Deductible'
                      : cat === 'COMMUTE'
                      ? 'Non-Deductible'
                      : 'Personal'}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Date and Destination */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="trip-date"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Date
            </label>
            <input
              id="trip-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="trip-destination"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Destination & Location (Name / Address)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" aria-hidden="true" />
              <input
                id="trip-destination"
                ref={destinationRef}
                type="text"
                placeholder="e.g. Acme Corp, San Jose / Office Depot, Sunnyvale"
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value);
                  clearError('destination');
                }}
                aria-invalid={Boolean(errors.destination)}
                aria-describedby={errors.destination ? 'trip-destination-error' : undefined}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                required
              />
            </div>
            {errors.destination && (
              <p id="trip-destination-error" role="alert" className="mt-1 text-xs text-rose-400">
                {errors.destination}
              </p>
            )}
          </div>
        </div>

        {/* Odometer & Distance Calculation */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Car className="w-4 h-4 text-blue-400" aria-hidden="true" />
              Contemporaneous Odometer Readings
            </span>
            <span className="text-[11px] text-slate-400">
              Vehicle Odo: {profile.currentOdometer.toLocaleString()} mi
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="trip-start-odometer"
                className="block text-[11px] font-medium text-slate-400 mb-1"
              >
                Start Odometer
              </label>
              <input
                id="trip-start-odometer"
                ref={startOdoRef}
                type="number"
                value={startOdo}
                onChange={(e) => handleStartChange(parseInt(e.target.value, 10) || 0)}
                aria-invalid={Boolean(errors.startOdo)}
                aria-describedby={errors.startOdo ? 'trip-start-odometer-error' : undefined}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 focus:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                required
              />
              {errors.startOdo && (
                <p id="trip-start-odometer-error" role="alert" className="mt-1 text-xs text-rose-400">
                  {errors.startOdo}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="trip-end-odometer"
                className="block text-[11px] font-medium text-slate-400 mb-1"
              >
                End Odometer
              </label>
              <input
                id="trip-end-odometer"
                ref={endOdoRef}
                type="number"
                value={endOdo}
                onChange={(e) => handleEndChange(parseInt(e.target.value, 10) || 0)}
                aria-invalid={Boolean(errors.endOdo)}
                aria-describedby={errors.endOdo ? 'trip-end-odometer-error' : undefined}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 focus:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                required
              />
              {errors.endOdo && (
                <p id="trip-end-odometer-error" role="alert" className="mt-1 text-xs text-rose-400">
                  {errors.endOdo}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="trip-distance"
                className="block text-[11px] font-medium text-slate-400 mb-1"
              >
                Trip Distance
              </label>
              <div className="relative">
                <input
                  id="trip-distance"
                  type="number"
                  value={distance}
                  onChange={(e) => handleDistanceChange(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-xl border border-blue-500/50 bg-blue-950/20 px-3 py-2 font-mono text-sm font-bold text-blue-300 focus:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  required
                />
                <span className="absolute right-2.5 top-2 text-xs font-mono text-blue-400" aria-hidden="true">
                  mi
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Business Purpose (IRC § 274 Requirement) */}
        {isBusiness && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="trip-business-purpose"
                className="text-xs font-medium text-slate-300 flex items-center gap-1.5"
              >
                <Tag className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
                Specific Business Purpose (IRC § 274 Audit Requirement)
              </label>
              <span className="text-[10px] text-amber-400">Required for deduction</span>
            </div>

            <textarea
              id="trip-business-purpose"
              ref={businessPurposeRef}
              rows={2}
              placeholder="Describe business reason (e.g., Client site technical consultation, hardware staging setup)..."
              value={businessPurpose}
              onChange={(e) => {
                setBusinessPurpose(e.target.value);
                clearError('businessPurpose');
              }}
              aria-invalid={Boolean(errors.businessPurpose)}
              aria-describedby={errors.businessPurpose ? 'trip-business-purpose-error' : undefined}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              required={isBusiness}
            />
            {errors.businessPurpose && (
              <p id="trip-business-purpose-error" role="alert" className="text-xs text-rose-400">
                {errors.businessPurpose}
              </p>
            )}

            {/* Quick Presets */}
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-slate-400">
                Quick Preset Shortcuts:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PURPOSE_PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => {
                      setBusinessPurpose(preset);
                      clearError('businessPurpose');
                    }}
                    aria-pressed={businessPurpose === preset}
                    aria-label={preset}
                    title={preset}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-[10px] text-slate-300 hover:border-slate-700 hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    + {preset.length > 32 ? preset.substring(0, 32) + '...' : preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tolls & Parking (Separate 100% deduction under IRC § 274) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="trip-tolls-parking"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Tolls & Parking ($ USD)
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" aria-hidden="true" />
              <input
                id="trip-tolls-parking"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={tollsAndParking || ''}
                onChange={(e) => setTollsAndParking(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-8 pr-3 py-2 text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              100% deductible on top of standard mileage.
            </p>
          </div>

          <div>
            <label
              htmlFor="trip-notes"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Notes (Optional)
            </label>
            <input
              id="trip-notes"
              type="text"
              placeholder="e.g. Bay Bridge fastrak, garage receipt"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>
        </div>

        {/* Estimated Deduction & Compliance Badge Banner */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
              isCompliant
                ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                : 'border-amber-500/30 bg-amber-500/15 text-amber-400'
            }`}>
              {isCompliant ? (
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              ) : (
                <AlertCircle className="w-5 h-5" aria-hidden="true" />
              )}

            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">
                {isCompliant ? 'IRC § 274 Audit Compliant' : 'Incomplete Statutory Information'}
              </div>
              <div className="text-[11px] text-slate-400">
                {isBusiness
                  ? `Standard Rate: $${rate}/mi for ${tripYear}`
                  : 'Non-business trip (no tax deduction)'}
              </div>
            </div>
          </div>

          {isBusiness && (
            <div className="text-right sm:border-l sm:border-slate-800 sm:pl-4">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">
                Tax Deduction
              </div>
              <div className="text-lg font-bold font-mono text-emerald-400">
                ${estimatedTotalDeduction.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-400">
                (${estimatedMileageDeduction.toFixed(2)} mi + ${tollsAndParking.toFixed(2)} tolls)
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full rounded-2xl bg-blue-600 py-3 px-4 font-semibold text-sm text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 active:scale-[0.99] transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Plus className="w-4 h-4" aria-hidden="true" /> Save & Contemporaneously Log Trip
        </button>
      </form>
    </div>
  );
};
