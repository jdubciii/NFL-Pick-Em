import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Camera,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Eye,
  Check,
  RotateCcw,
  FileVideo,
  Image as ImageIcon,
  ShieldCheck,
  CheckCheck,
  XCircle,
  Sparkles,
  AlertCircle,
  Film
} from 'lucide-react';

export interface PenaltyMedia {
  id: string;
  penaltyId: string;
  poolId: string;
  userId: string;
  storagePath: string;
  mediaType: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  confirmedBy?: string | null;
  createdAt: string;
  confirmer?: {
    id: string;
    email: string;
  } | null;
}

export interface PenaltyLedgerItem {
  id: string;
  poolId: string;
  userId: string;
  weekNumber: number | null;
  delta: number;
  reason: string;
  createdById: string;
  createdAt: string;
  createdBy?: {
    id: string;
    email: string;
  };
  media?: PenaltyMedia | null;
}

interface PoolOption {
  id: string;
  name: string;
  adminId?: string;
}

export interface PenaltyLedgerViewProps {
  initialPoolId?: string;
  memberIdFilter?: string;
  onRefresh?: () => void;
}

export const PenaltyLedgerView: React.FC<PenaltyLedgerViewProps> = ({
  initialPoolId,
  memberIdFilter,
  onRefresh,
}) => {
  const { token, user } = useAuth();
  const [pools, setPools] = useState<PoolOption[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string>(initialPoolId || '');
  const [penalties, setPenalties] = useState<PenaltyLedgerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Upload Modal State
  const [activePenaltyForUpload, setActivePenaltyForUpload] = useState<PenaltyLedgerItem | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [compressionStatus, setCompressionStatus] = useState<string | null>(null);
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Inspector / Review Modal State
  const [inspectingPenalty, setInspectingPenalty] = useState<PenaltyLedgerItem | null>(null);
  const [confirmingStatus, setConfirmingStatus] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine commissioner status for current selected pool
  const currentPool = pools.find((p) => p.id === selectedPoolId);
  const isCommissioner = user?.role === 'ADMIN' || (currentPool && currentPool.adminId === user?.id);

  // 1. Fetch available pools if not supplied
  useEffect(() => {
    const fetchPools = async () => {
      try {
        const res = await fetch('/api/pools', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPools(data);
          if (!selectedPoolId && data.length > 0) {
            setSelectedPoolId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load pools:', err);
      }
    };

    fetchPools();
  }, [token, selectedPoolId]);

  // 2. Fetch penalties for selected pool
  const fetchPenalties = useCallback(async () => {
    if (!selectedPoolId) return;
    setLoading(true);
    setError(null);
    try {
      // If memberIdFilter is provided, fetch specifically for that member
      const endpoint = memberIdFilter
        ? `/api/pools/${selectedPoolId}/penalties/member/${memberIdFilter}`
        : `/api/pools/${selectedPoolId}/penalties/member/${user?.id}`;

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to load penalty ledger.');
      }

      const data = await res.json();
      setPenalties(data);
    } catch (err: any) {
      setError(err.message || 'Error loading penalties.');
    } finally {
      setLoading(false);
    }
  }, [selectedPoolId, memberIdFilter, user?.id, token]);

  useEffect(() => {
    fetchPenalties();
  }, [fetchPenalties]);

  // 3. Client-Side Image Compression Engine (< 5MB limit)
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit
      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimensions: 1920x1080 Full HD
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1080;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.82 quality
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Image compression failed'));
                return;
              }

              if (blob.size > MAX_SIZE_BYTES) {
                // Secondary pass with higher compression if still above 5MB
                canvas.toBlob(
                  (secondBlob) => {
                    if (!secondBlob || secondBlob.size > MAX_SIZE_BYTES) {
                      reject(new Error('Image exceeds 5MB limit after compression.'));
                      return;
                    }
                    const compressed = new File([secondBlob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                      type: 'image/jpeg',
                      lastModified: Date.now(),
                    });
                    resolve(compressed);
                  },
                  'image/jpeg',
                  0.65
                );
              } else {
                const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressed);
              }
            },
            'image/jpeg',
            0.82
          );
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // 4. Client-Side Video Validation & Compression Engine (< 20MB limit)
  const validateAndProcessVideo = async (file: File): Promise<File> => {
    const MAX_VIDEO_BYTES = 20 * 1024 * 1024; // 20MB limit per spec

    if (file.size > MAX_VIDEO_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      throw new Error(
        `Video size (${sizeMB}MB) exceeds the maximum allowed 20MB limit. Please trim or compress the clip before uploading.`
      );
    }

    return file;
  };

  // 5. Handle File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setCompressedFile(null);

    const isImg = file.type.startsWith('image/');
    const isVid = file.type.startsWith('video/');

    if (!isImg && !isVid) {
      setUploadError('Please select a valid image (JPEG, PNG, WEBP) or video (MP4, MOV, WEBM) file.');
      return;
    }

    setMediaType(isImg ? 'image' : 'video');
    const preview = URL.createObjectURL(file);
    setFilePreviewUrl(preview);

    setIsCompressing(true);
    setCompressionStatus(isImg ? 'Compressing image under 5MB threshold...' : 'Validating video payload under 20MB threshold...');

    try {
      if (isImg) {
        const compressed = await compressImage(file);
        setCompressedFile(compressed);
        const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const compressedSizeMB = (compressed.size / (1024 * 1024)).toFixed(2);
        setCompressionStatus(`Compressed from ${originalSizeMB}MB down to ${compressedSizeMB}MB.`);
      } else {
        const validated = await validateAndProcessVideo(file);
        setCompressedFile(validated);
        const videoSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        setCompressionStatus(`Video verified: ${videoSizeMB}MB (Within 20MB limit).`);
      }
    } catch (err: any) {
      setUploadError(err.message || 'File processing failed.');
      setCompressedFile(null);
    } finally {
      setIsCompressing(false);
    }
  };

  // 6. Submit Media Upload
  const handleUploadSubmit = async () => {
    if (!activePenaltyForUpload || !compressedFile || !selectedPoolId) return;

    setUploading(true);
    setUploadError(null);

    try {
      // Construct deterministic storage path for Supabase Storage
      const extension = compressedFile.name.split('.').pop() || 'mp4';
      const storagePath = `pools/${selectedPoolId}/penalties/${activePenaltyForUpload.id}/proof_${Date.now()}.${extension}`;

      // Call API to register Supabase path in PenaltyMedia table
      const res = await fetch(`/api/pools/${selectedPoolId}/penalties/${activePenaltyForUpload.id}/media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storage_path: storagePath,
          media_type: compressedFile.type,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register penalty media.');
      }

      // Close modal and refresh list
      closeUploadModal();
      fetchPenalties();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  // 7. Commissioner Status Flip (Confirm / Reject)
  const handleStatusFlip = async (penaltyId: string, status: 'CONFIRMED' | 'REJECTED' | 'PENDING') => {
    if (!selectedPoolId) return;
    setConfirmingStatus(true);
    try {
      const res = await fetch(`/api/pools/${selectedPoolId}/penalties/${penaltyId}/media/confirm`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update confirmation status.');
      }

      // Update local state
      setPenalties((prev) =>
        prev.map((p) => (p.id === penaltyId ? { ...p, media: data.media } : p))
      );
      if (inspectingPenalty?.id === penaltyId) {
        setInspectingPenalty((prev) => (prev ? { ...prev, media: data.media } : null));
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error updating status.');
    } finally {
      setConfirmingStatus(false);
    }
  };

  const closeUploadModal = () => {
    setActivePenaltyForUpload(null);
    setCompressedFile(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
    setMediaType(null);
    setUploadError(null);
    setCompressionStatus(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Pool Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-xl">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              Shot-Cam Penalty Portal
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Phase 10
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Submit and verify proof of drank penalties. Strict Row-Level Security and Commissioner audit verification.
            </p>
          </div>
        </div>

        {/* Pool Selector Dropdown */}
        {pools.length > 1 && (
          <div className="w-full sm:w-auto">
            <select
              value={selectedPoolId}
              onChange={(e) => setSelectedPoolId(e.target.value)}
              className="w-full sm:w-56 bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 font-semibold focus:outline-none focus:border-amber-500"
            >
              {pools.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Penalty Ledger Cards */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800/80">
          <RotateCcw className="w-6 h-6 animate-spin text-amber-400" />
          <span>Loading Shot-Cam ledger and proof records...</span>
        </div>
      ) : error ? (
        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : penalties.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm bg-slate-900/40 rounded-2xl border border-slate-800/80 flex flex-col items-center justify-center space-y-3">
          <div className="p-3.5 rounded-full bg-slate-800 text-slate-500">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <span className="font-semibold text-slate-300">Clean Slate! No Penalties Recorded.</span>
          <p className="text-xs text-slate-500 max-w-sm">
            You currently have zero pending or logged shot penalties.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {penalties.map((penalty) => {
            const hasMedia = !!penalty.media;
            const status = penalty.media?.status;
            const isConfirmed = status === 'CONFIRMED';
            const isPending = status === 'PENDING';
            const isRejected = status === 'REJECTED';

            return (
              <div
                key={penalty.id}
                className={`p-5 rounded-2xl border transition-all duration-200 bg-slate-900/80 backdrop-blur-sm flex flex-col justify-between space-y-4 shadow-lg ${
                  isConfirmed
                    ? 'border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-emerald-950/20'
                    : isPending
                    ? 'border-amber-500/30 hover:border-amber-500/50 hover:shadow-amber-950/20'
                    : isRejected
                    ? 'border-rose-500/30 hover:border-rose-500/50'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Card Header: Week, Delta, Status Chip */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {penalty.delta > 0 ? `+${penalty.delta.toFixed(2)}` : penalty.delta.toFixed(2)} Shots
                      </span>
                      {penalty.weekNumber && (
                        <span className="text-xs font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-750">
                          Week {penalty.weekNumber}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-black text-slate-100 pt-1">
                      {penalty.reason}
                    </h3>
                  </div>

                  {/* Status Chips */}
                  <div>
                    {isConfirmed && (
                      <span
                        id={`status-chip-${penalty.id}`}
                        className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-950/50"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Shot Confirmed</span>
                      </span>
                    )}

                    {isPending && (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Pending Review</span>
                      </span>
                    )}

                    {isRejected && (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Rejected (Re-upload)</span>
                      </span>
                    )}

                    {!hasMedia && (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <span>Proof Required</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Proof Information / Media Details */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-850 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Logged by: {penalty.createdBy?.email || 'System'}</span>
                    <span>{new Date(penalty.createdAt).toLocaleDateString()}</span>
                  </div>

                  {hasMedia && (
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-slate-300 truncate max-w-[200px]">
                        {penalty.media?.mediaType.includes('video') ? (
                          <Film className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        )}
                        <span className="truncate text-[11px] font-mono">
                          {penalty.media?.storagePath.split('/').pop()}
                        </span>
                      </div>

                      <button
                        onClick={() => setInspectingPenalty(penalty)}
                        className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center space-x-1 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/20 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect Proof</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  {/* Upload / Re-Upload Button */}
                  <button
                    onClick={() => setActivePenaltyForUpload(penalty)}
                    className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 hover:border-slate-600 transition-all flex items-center justify-center space-x-2 shadow-sm"
                  >
                    <UploadCloud className="w-4 h-4 text-amber-400" />
                    <span>{hasMedia ? 'Re-upload Shot Proof' : 'Upload Shot Proof'}</span>
                  </button>

                  {/* Commissioner Fast-Confirm Button */}
                  {isCommissioner && hasMedia && isPending && (
                    <button
                      onClick={() => handleStatusFlip(penalty.id, 'CONFIRMED')}
                      disabled={confirmingStatus}
                      className="py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white transition-opacity flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-950/40 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>Confirm</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 8. Client-Side Upload & Compression Modal */}
      {activePenaltyForUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-750 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Shot-Cam Proof Upload</h3>
                  <p className="text-xs text-slate-400">
                    Penalty: <span className="text-rose-400 font-semibold">{activePenaltyForUpload.reason}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={closeUploadModal}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-slate-200 text-sm flex-1">
              {/* Constraints Warning Alert */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="flex items-center space-x-2 text-amber-400 font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>Client-Side Compression Constraints</span>
                </div>
                <p>• Max video file size: <strong className="text-slate-200">20MB</strong> (MP4, QuickTime, WebM)</p>
                <p>• Max image file size: <strong className="text-slate-200">5MB</strong> (JPEG, PNG, WebP) with auto-resizing</p>
              </div>

              {uploadError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Dropzone / File Picker */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                onChange={handleFileChange}
                className="hidden"
              />

              {!filePreviewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-amber-500/80 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-950/50 hover:bg-slate-950/80 flex flex-col items-center justify-center space-y-3 group"
                >
                  <div className="p-4 rounded-2xl bg-slate-800 group-hover:bg-amber-500/20 text-slate-400 group-hover:text-amber-400 transition-colors">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-200 group-hover:text-amber-300">
                      Click to browse or drop media file
                    </span>
                    <p className="text-xs text-slate-500 mt-1">Video (max 20MB) or Photo (max 5MB)</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Media Preview Box */}
                  <div className="relative rounded-2xl overflow-hidden border border-slate-750 bg-black aspect-video flex items-center justify-center">
                    {mediaType === 'image' ? (
                      <img
                        src={filePreviewUrl}
                        alt="Shot preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <video
                        src={filePreviewUrl}
                        controls
                        className="w-full h-full object-contain"
                      />
                    )}

                    {compressedFile && (
                      <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-slate-950/80 text-slate-200 text-xs font-mono font-bold border border-slate-700 backdrop-blur-sm truncate max-w-[240px]">
                        {compressedFile.name}
                      </div>
                    )}

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 text-white text-xs font-bold border border-slate-700 backdrop-blur-sm transition-colors flex items-center space-x-1.5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Replace</span>
                    </button>
                  </div>

                  {/* Compression Feedback Bar */}
                  {isCompressing ? (
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center space-x-2 animate-pulse">
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>{compressionStatus || 'Optimizing media...'}</span>
                    </div>
                  ) : compressionStatus ? (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{compressionStatus}</span>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                disabled={!compressedFile || isCompressing || uploading}
                onClick={handleUploadSubmit}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-95 text-slate-950 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{uploading ? 'Registering Media Path...' : 'Submit Shot Proof for Review'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Inspector / Lightbox Modal */}
      {inspectingPenalty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-750 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>Shot Proof Inspector</span>
                  {inspectingPenalty.media?.status === 'CONFIRMED' && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Confirmed
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  {inspectingPenalty.reason} (Delta: {inspectingPenalty.delta > 0 ? `+${inspectingPenalty.delta}` : inspectingPenalty.delta} shots)
                </p>
              </div>
              <button
                onClick={() => setInspectingPenalty(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Media Display */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-video flex items-center justify-center">
                {inspectingPenalty.media?.mediaType.includes('video') ? (
                  <div className="flex flex-col items-center justify-center text-slate-400 space-y-2 p-6 text-center">
                    <FileVideo className="w-12 h-12 text-indigo-400" />
                    <span className="font-bold text-sm text-slate-200">Supabase Storage Video Object</span>
                    <span className="text-xs text-slate-500 font-mono break-all">{inspectingPenalty.media.storagePath}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 space-y-2 p-6 text-center">
                    <ImageIcon className="w-12 h-12 text-amber-400" />
                    <span className="font-bold text-sm text-slate-200">Supabase Storage Image Object</span>
                    <span className="text-xs text-slate-500 font-mono break-all">{inspectingPenalty.media?.storagePath}</span>
                  </div>
                )}
              </div>

              {/* Commissioner Verification Controls */}
              {isCommissioner && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Commissioner Verification Controls
                    </span>
                    <span className="text-xs text-slate-500">
                      Status: <strong className="text-amber-300">{inspectingPenalty.media?.status}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={confirmingStatus || inspectingPenalty.media?.status === 'CONFIRMED'}
                      onClick={() => handleStatusFlip(inspectingPenalty.id, 'CONFIRMED')}
                      className="py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center justify-center space-x-2 disabled:opacity-40"
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span>Confirm Shot (Approve)</span>
                    </button>

                    <button
                      type="button"
                      disabled={confirmingStatus || inspectingPenalty.media?.status === 'REJECTED'}
                      onClick={() => handleStatusFlip(inspectingPenalty.id, 'REJECTED')}
                      className="py-2.5 px-4 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center justify-center space-x-2 disabled:opacity-40"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject (Require Re-upload)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
