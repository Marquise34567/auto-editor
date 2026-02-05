"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PendingSubscriptionBanner } from "@/components/PendingSubscriptionBanner";
import EditorControls from "@/components/editor/EditorControls";
import ProgressStepper from "@/components/editor/ProgressStepper";
import PreviewCard from "@/components/editor/PreviewCard";
import UpgradeModal from "@/components/UpgradeModal";
import {
  AnalyzeResult,
  CandidateSegment,
  GeneratedClip,
  GenerateSettings,
  ManualFacecamCrop,
} from "@/lib/types";
import { getPlan } from "@/config/plans";
import type { PlanId } from "@/config/plans";
import { trackPostHogEvent, trackPlausibleEvent } from "@/lib/analytics/client";
import { uploadVideoToStorage } from "@/lib/client/storage-upload";

type BillingStatus = {
  planId: PlanId;
  subscriptionStatus: string;
  rendersUsed: number;
  rendersRemaining: number;
  canRender: boolean;
  maxVideoMinutes: number;
  maxExportQuality: "720p" | "1080p" | "4k";
  watermarkRequired: boolean;
  queuePriority: "background" | "standard" | "priority" | "ultra";
  periodStartUnix: number;
  periodEndUnix: number;
  periodDaysRemaining: number;
  message: string;
};

type JobStatusResponse = {
  status: string;
  stage?: string;
  message?: string;
  percent?: number;
  progress?: number;
  etaSec?: number;
  draftUrl?: string;
  finalUrl?: string;
  outputUrl?: string;
  inputSizeBytes?: number;
  outputSizeBytes?: number;
  details?: {
    chosenStart?: number;
    chosenEnd?: number;
    hookStart?: number;
    improvements?: string[];
    editsApplied?: {
      originalDurationSec: number;
      finalDurationSec: number;
      removedSec: number;
      hook: { start: number; end: number };
      segmentCount: number;
    };
  };
  error?: string;
  logs?: string[];
};

const creatorId = "default";

const steps = [
  "Queued",
  "Analyzing",
  "Enhancing audio",
  "Draft render",
  "Final render",
  "Done",
];

const statusToStep: Record<string, number> = {
  QUEUED: 0,
  ANALYZING: 1,
  ENHANCING_AUDIO: 2,
  RENDERING_DRAFT: 3,
  DRAFT_READY: 3,
  RENDERING_FINAL: 4,
  DONE: 5,
  FAILED: 5,
};

export default function EditorPage() {
  const [title, setTitle] = useState("Creator sprint cut");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateSegment[]>([]);
  const [primaryClip, setPrimaryClip] = useState<GeneratedClip | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [generationDone, setGenerationDone] = useState(false);
  const [analyzeEta, setAnalyzeEta] = useState<number | null>(null);
  const [generateEta, setGenerateEta] = useState<number | null>(null);
  const [etaStart, setEtaStart] = useState<number | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("QUEUED");
  const [draftUrl, setDraftUrl] = useState<string | null>(null);
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [stageMessage, setStageMessage] = useState<string | null>(null);
  const [details, setDetails] = useState<JobStatusResponse["details"] | null>(null);
  const [inputSizeBytes, setInputSizeBytes] = useState<number | undefined>();
  const [outputSizeBytes, setOutputSizeBytes] = useState<number | undefined>();
  // Plan & billing state
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const uploadTrackedRef = useRef(false);
  const generateTrackedRef = useRef(false);
  const clipGeneratedTrackedRef = useRef(false);
  const [settings, setSettings] = useState<GenerateSettings>({
    clipLengths: [30, 45],
    numClips: 3,
    aggressiveness: "med",
    autoSelect: true,
    autoHook: true,
    soundEnhance: true,
    manualFacecamCrop: null,
  });

  const logEvent = async (
    type:
      | "kept_clip"
      | "discarded_clip"
      | "regenerate"
      | "hook_override"
      | "adjust_length"
      | "downloaded"
      | "set_aggressiveness"
      | "set_clip_length",
    payload?: Record<string, unknown>
  ) => {
    const getCircularReplacer = () => {
      const seen = new WeakSet();
      return (_key: string, value: unknown) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value as object)) {
            return "[Circular]";
          }
          seen.add(value as object);
        }
        return value;
      };
    };
    try {
      const safePayload = payload
        ? JSON.parse(JSON.stringify(payload, getCircularReplacer()))
        : undefined;
      await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId, type, payload: safePayload }),
      });
    } catch {
      // ignore
    }
  };

  // Load billing status on mount from server
  useEffect(() => {
    const fetchBillingStatus = async () => {
      try {
        const response = await fetch("/api/billing/status");
        if (!response.ok) {
          throw new Error(`Failed to fetch billing status: ${response.statusText}`);
        }
        const data: BillingStatus = await response.json();
        setBillingStatus(data);
        setBillingError(null);
      } catch (err) {
        console.error("Error fetching billing status:", err);
        setBillingError(err instanceof Error ? err.message : "Unknown error");
      }
    };
    fetchBillingStatus();
  }, []);

  useEffect(() => {
    if (!file) {
      setFileUrl(null);
      setAnalysisDone(false);
      setGenerationDone(false);
      setAnalyzeEta(null);
      setGenerateEta(null);
      setEtaStart(null);
      setDraftUrl(null);
      setFinalUrl(null);
      setOutputUrl(null);
      setStageMessage(null);
      setDetails(null);
      setError(null);
      setErrorDetails(null);
      setShowErrorDetails(false);
      setJobId(null);
      setAnalyzing(false);
      uploadTrackedRef.current = false;
      generateTrackedRef.current = false;
      clipGeneratedTrackedRef.current = false;
      return;
    }
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    setAnalysisDone(false);
    setGenerationDone(false);

    // Auto-trigger analyze
    handleAnalyze(file);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!etaStart || (!analyzeEta && !generateEta)) return;
    const interval = setInterval(() => {
      setAnalyzeEta((prev) => (prev ? Math.max(0, prev - 1) : prev));
      setGenerateEta((prev) => (prev ? Math.max(0, prev - 1) : prev));
    }, 1000);
    return () => clearInterval(interval);
  }, [etaStart, analyzeEta, generateEta]);

  useEffect(() => {
    if (!jobId) return;
    
    // Stop polling when job is done or failed to prevent flickering
    if (jobStatus === "DONE" || jobStatus === "FAILED") return;
    
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/job-status?id=${jobId}`);
        if (!response.ok) return;
        const data = (await response.json()) as JobStatusResponse;
        setLogs(data.logs ?? []);
        setProgressStep(statusToStep[data.status] ?? 0);
        setJobStatus(data.status ?? "QUEUED");
        setDraftUrl(data.draftUrl ?? null);
        setFinalUrl(data.finalUrl ?? null);
        setOutputUrl(data.outputUrl ?? null);
        setStageMessage(data.message ?? null);
        setDetails(data.details ?? null);
        setInputSizeBytes(data.inputSizeBytes);
        setOutputSizeBytes(data.outputSizeBytes);
        if (typeof data.etaSec === "number") {
          setGenerateEta(data.etaSec);
        }

        if (data.details?.editsApplied && data.details.editsApplied.removedSec < 3) {
          setError("No meaningful edits applied");
          setErrorDetails(
            `Removed ${data.details.editsApplied.removedSec.toFixed(1)}s (minimum 3s required)`
          );
        }
        
        if (
          data.status === "ENHANCING_AUDIO" ||
          data.status === "RENDERING_DRAFT" ||
          data.status === "DRAFT_READY" ||
          data.status === "RENDERING_FINAL" ||
          data.status === "DONE"
        ) {
          setAnalysisDone(true);
          // Transition from analyze to render phase
          if (analyzeEta && !generateEta) {
            setAnalyzeEta(null);
            setGenerateEta(Math.max(10, 30)); // Default render time estimate
          }
        }
        if (data.status === "DONE" && (data.outputUrl || data.finalUrl)) {
          setGenerationDone(true);
          setAnalyzing(false);
          if (!clipGeneratedTrackedRef.current) {
            trackPostHogEvent("clip_generated");
            trackPlausibleEvent("GenerateClip");
            clipGeneratedTrackedRef.current = true;
          }
        }
        if (data.status === "FAILED") {
          setAnalyzing(false);
          setError(data.error ?? "Pipeline failed");
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId, primaryClip, jobStatus]);

  // Auto-trigger generate when analysis completes
  useEffect(() => {
    if (!jobId || !analysisDone || generationDone) return;

    // Check if already generating or done
    if (jobStatus === "RENDERING_FINAL" || jobStatus === "DONE") return;

    const triggerGenerate = async () => {
      try {
        console.log("[editor] Triggering generate for jobId:", jobId);
        if (!generateTrackedRef.current) {
          trackPostHogEvent("clip_generation_started");
          generateTrackedRef.current = true;
        }
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId,
            soundEnhance: settings.soundEnhance,
          }),
        });

        if (!response.ok) {
          let errorText = "Unknown error";
          let isLimitExceeded = false;
          try {
            const data = await response.json();
            errorText = data.details || data.error || "Generate failed";
            
            // Check for quota exceeded (402 Payment Required)
            if (response.status === 402) {
              isLimitExceeded = true;
              // Refetch billing status to show updated quota
              const statusRes = await fetch("/api/billing/status");
              if (statusRes.ok) {
                const statusData = await statusRes.json();
                setBillingStatus(statusData);
              }
              setShowUpgradeModal(true);
            }
            
            if (data.ffmpegError) {
              console.error("[editor] FFmpeg error:", data.ffmpegError);
              setErrorDetails(data.ffmpegError);
            }
          } catch {
            errorText = await response.text();
          }
          
          if (!isLimitExceeded) {
            console.error("[editor] Generate failed:", errorText);
            setError("Generate failed: " + errorText.substring(0, 500));
          }
          
          setAnalyzing(false);
          return;
        }

        const data = await response.json();
        console.log("[editor] Generate initiated successfully");
      } catch (err) {
        console.error("[editor] Generate error:", err);
        setError("Generate error: " + String(err));
        setAnalyzing(false);
      }
    };

    triggerGenerate();
  }, [jobId, analysisDone, generationDone, jobStatus]);

  useEffect(() => {
    const hydratePreferences = async () => {
      try {
        const response = await fetch(`/api/preferences?creatorId=${creatorId}`);
        if (!response.ok) return;
        const data = (await response.json()) as {
          profile: {
            preferredClipLengths?: Record<string, number>;
            aggressiveness?: Record<string, number>;
          };
        };
        const preferredLengths = data.profile.preferredClipLengths;
        if (preferredLengths) {
          const sorted = Object.entries(preferredLengths)
            .sort((a, b) => b[1] - a[1])
            .map(([length]) => Number(length))
            .filter((value) => Number.isFinite(value));
          if (sorted.length) {
            setSettings((prev) => ({
              ...prev,
              clipLengths: Array.from(new Set(sorted.slice(0, 3))),
            }));
          }
        }
        const aggressiveness = data.profile.aggressiveness;
        if (aggressiveness) {
          const best = (Object.entries(aggressiveness)
            .sort((a, b) => b[1] - a[1])
            .map(([level]) => level)[0] || "med") as
            | "low"
            | "med"
            | "high";
          setSettings((prev) => ({ ...prev, aggressiveness: best }));
        }
      } catch {
        // ignore
      }
    };
    hydratePreferences();
  }, []);

  const manualCrop = settings.manualFacecamCrop;

  const cropPreviewStyle = useMemo(() => {
    if (!manualCrop) return null;
    return {
      left: `${manualCrop.x * 100}%`,
      top: `${manualCrop.y * 100}%`,
      width: `${manualCrop.w * 100}%`,
      height: `${manualCrop.h * 100}%`,
    };
  }, [manualCrop]);

  const handleAnalyze = async (fileToAnalyze: File) => {
    const nextSettings = {
      ...settings,
      autoSelect: true,
      autoHook: true,
      soundEnhance: true,
    };
    setSettings(nextSettings);
    setError(null);
    setErrorDetails(null);
    setShowErrorDetails(false);
    setAnalyzing(true);
    setProgressStep(1);
    setPrimaryClip(null);
    setJobStatus("ANALYZING");
    setEtaStart(Date.now());
    setAnalyzeEta(18);
    setGenerateEta(null);
    uploadTrackedRef.current = false;
    generateTrackedRef.current = false;
    clipGeneratedTrackedRef.current = false;

    try {
      if (!uploadTrackedRef.current) {
        trackPostHogEvent("upload_started", { sizeBytes: fileToAnalyze.size });
        trackPlausibleEvent("UploadVideo");
        uploadTrackedRef.current = true;
      }

      // Step 1: Upload video to Supabase Storage
      console.log("=== Starting Video Upload to Storage ===");
      console.log("File:", fileToAnalyze.name, "Size:", fileToAnalyze.size);

      let videoPath: string;
      try {
        const uploadResult = await uploadVideoToStorage(fileToAnalyze, (percent) => {
          console.log(`Upload progress: ${percent}%`);
        });
        videoPath = uploadResult.storagePath;
        console.log("Upload successful, path:", videoPath);
      } catch (uploadError) {
        const errorMessage = uploadError instanceof Error 
          ? uploadError.message 
          : "Failed to upload video to storage";
        setError(errorMessage);
        setErrorDetails(JSON.stringify({ uploadError }, null, 2));
        setAnalyzing(false);
        return;
      }

      // Step 2: Send video path to analyze endpoint
      console.log("=== Starting Analysis ===");
      console.log("Clip lengths:", nextSettings.clipLengths.join(","));

      const analyzePayload = {
        videoPath,
        clipLengths: nextSettings.clipLengths.join(","),
      };

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(analyzePayload),
      });

      if (!response.ok) {
        const raw = await response.text();
        let data: any = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch {
          // not JSON
        }

        const errorMessage =
          data?.details ||
          data?.error ||
          raw.substring(0, 400) ||
          `Analyze failed (HTTP ${response.status})`;

        const detailsPayload = data
          ? { httpStatus: response.status, ...data }
          : { httpStatus: response.status, raw };

        setError(errorMessage);
        setErrorDetails(JSON.stringify(detailsPayload, null, 2));
        setAnalyzing(false);
        return;
      }

      const data = (await response.json()) as AnalyzeResult;
      console.log("Analyze success, jobId:", data.jobId);
      trackPostHogEvent("upload_completed");
      setJobId(data.jobId);
      setCandidates(data.candidates);
      setProgressStep(2);
      setLogs([`Analyzed ${fileToAnalyze.name}`, `${data.candidates.length} candidates`]);
      setAnalysisDone(false);
      setGenerationDone(false);
      logEvent("set_clip_length", { length: nextSettings.clipLengths[0] });
    } catch (err) {
      setError(String(err));
      setErrorDetails(String(err));
      setAnalyzing(false);
    }
  };

  const updateManualCrop = (next: ManualFacecamCrop) => {
    setSettings((prev) => ({
      ...prev,
      manualFacecamCrop: next,
    }));
    logEvent("hook_override", { style: "manual_crop" });
  };

  return (
    <ProtectedRoute>
      {/* Pending Subscription Banner (shows if payment made but webhooks not live) */}
      <PendingSubscriptionBanner />
      
      <div className="min-h-screen bg-[#07090f] px-4 sm:px-6 py-6 sm:py-10 text-white lg:px-16">
      <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">{/* Existing content below */}
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-4 sm:gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold">Auto-Editor</h1>
            <p className="text-sm sm:text-base text-white/60">
              Premium creator workflow for high-retention vertical clips.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs sm:text-sm text-white/60">
              {analysisDone && (
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-200">
                  Analysis done
                </span>
              )}
              {generationDone && (
                <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1.5 text-fuchsia-200">
                  Clips ready
                </span>
              )}
            </div>
            <div className="mt-4 grid gap-2 text-xs sm:text-sm text-white/60">
          {/* Billing Status Display */}
          {billingStatus && (
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-left sm:text-right">
                <p className="text-xs sm:text-sm uppercase tracking-widest text-white/50 mb-1">
                  {getPlan(billingStatus.planId).name} Plan
                </p>
                <p className="text-base sm:text-sm font-semibold text-white">
                  {billingStatus.rendersRemaining === 999999 ? (
                    <>Unlimited renders</>
                  ) : (
                    <>{billingStatus.rendersRemaining} renders left</>
                  )}
                </p>
                <p className="text-xs text-white/40 mt-1">
                  {billingStatus.periodDaysRemaining} days remaining
                </p>
                {billingStatus.planId === 'free' && (
                  <Link
                    href="/pricing"
                    className="inline-flex mt-2 text-xs sm:text-sm px-3 py-2 rounded-full bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 border border-blue-500/30 transition-colors min-h-11 items-center"
                  >
                    Upgrade
                  </Link>
                )}
              </div>
            </div>
          )}              {[
                {
                  label: "Auto-select best moments",
                  done:
                    jobStatus === "ANALYZING" ||
                    jobStatus === "ENHANCING_AUDIO" ||
                    jobStatus === "RENDERING_DRAFT" ||
                    jobStatus === "DRAFT_READY" ||
                    jobStatus === "RENDERING_FINAL" ||
                    jobStatus === "DONE",
                },
                {
                  label: "Auto-hook selection",
                  done:
                    jobStatus === "ENHANCING_AUDIO" ||
                    jobStatus === "RENDERING_DRAFT" ||
                    jobStatus === "DRAFT_READY" ||
                    jobStatus === "RENDERING_FINAL" ||
                    jobStatus === "DONE",
                },
                {
                  label: "Sound enhance",
                  done:
                    jobStatus === "RENDERING_DRAFT" ||
                    jobStatus === "DRAFT_READY" ||
                    jobStatus === "RENDERING_FINAL" ||
                    jobStatus === "DONE",
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
                      item.done
                        ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                        : "border-white/15 text-white/40"
                    }`}
                  >
                    {item.done ? "✓" : "•"}
                  </span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <ProgressStepper steps={steps} currentStep={progressStep} />
        </div>

        {error && (
          <div className="rounded-2xl sm:rounded-3xl border border-red-500/40 bg-red-500/10 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-red-200">Something went wrong</h3>
                <p className="text-sm sm:text-base text-red-200/70">{error}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setShowErrorDetails((prev) => !prev)}
                  className="rounded-full border border-red-200/30 px-4 py-2.5 text-xs sm:text-sm text-red-200 min-h-11"
                >
                  {showErrorDetails ? "Hide details" : "Show details"}
                </button>
                <button
                  onClick={() => {
                    setFile(null);
                    setError(null);
                    setErrorDetails(null);
                    setShowErrorDetails(false);
                    setJobId(null);
                    setAnalyzing(false);
                  }}
                  className="rounded-full border border-red-200/30 bg-red-500/20 px-4 py-2.5 text-xs sm:text-sm text-red-200 hover:bg-red-500/30 min-h-11"
                >
                  Try Again
                </button>
              </div>
            </div>
            {showErrorDetails && (
              <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl border border-red-500/20 bg-black/30 p-4 text-xs sm:text-sm text-red-100/90">
                {errorDetails ?? "No details available"}
              </pre>
            )}
          </div>
        )}

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[360px_1fr]">
          <EditorControls
            title={title}
            onTitleChange={setTitle}
            onFileChange={(event) => {
              const selectedFile = event.target.files?.[0];
              if (selectedFile && !analyzing) {
                setFile(selectedFile);
              } else if (!selectedFile) {
                setFile(null);
              }
              // Reset input to allow re-selecting same file
              event.target.value = '';
            }}
            onOpenCrop={() => setShowCrop(true)}
            settings={settings}
            locked={analyzing}
            onSettingsChange={(next) => {
              if (next.clipLengths !== settings.clipLengths) {
                const added = next.clipLengths.find(
                  (len) => !settings.clipLengths.includes(len)
                );
                if (added) {
                  logEvent("set_clip_length", { length: added });
                }
              }
              if (next.aggressiveness !== settings.aggressiveness) {
                logEvent("set_aggressiveness", { level: next.aggressiveness });
              }
              setSettings(next);
            }}
          />

          <div className="space-y-6">
            <PreviewCard
              clip={primaryClip}
              draftUrl={draftUrl}
              finalUrl={finalUrl}
              outputUrl={outputUrl}
              status={jobStatus}
              eta={generateEta || analyzeEta}
              stageMessage={stageMessage}
              inputSizeBytes={inputSizeBytes}
              outputSizeBytes={outputSizeBytes}
              details={details}
            />
          </div>
        </div>

        {showCrop && (
          <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 p-4 sm:p-6">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0c1018] p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold">Manual Facecam Crop</h3>
                  <p className="text-sm sm:text-base text-white/50">
                    Set a normalized crop area for the facecam layer.
                  </p>
                </div>
                <button
                  onClick={() => setShowCrop(false)}
                  className="rounded-full border border-white/15 px-4 py-2.5 text-xs sm:text-sm text-white/70 min-h-11"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 sm:mt-6 grid gap-4 sm:gap-6 lg:grid-cols-[1fr_260px]">
                <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                  {fileUrl ? (
                    <video
                      src={fileUrl}
                      className="h-full w-full object-cover"
                      controls
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm sm:text-base text-white/50">
                      Upload a video to preview crop
                    </div>
                  )}
                  {manualCrop && (
                    <div
                      className="pointer-events-none absolute border border-fuchsia-400"
                      style={cropPreviewStyle ?? undefined}
                    />
                  )}
                </div>

                <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                  {manualCrop ? (
                    <>
                      {([
                        { key: "x", label: "X" },
                        { key: "y", label: "Y" },
                        { key: "w", label: "Width" },
                        { key: "h", label: "Height" },
                      ] as const).map((item) => (
                        <div key={item.key}>
                          <label className="text-xs sm:text-sm uppercase tracking-[0.2em] text-white/40">
                            {item.label}
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={manualCrop[item.key]}
                            onChange={(event) =>
                              updateManualCrop({
                                ...manualCrop,
                                [item.key]: Number(event.target.value),
                              })
                            }
                            className="mt-2 w-full"
                          />
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-sm sm:text-base text-white/50">
                      Enable manual crop in settings to adjust values.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade Modal */}
        {billingStatus && (
          <UpgradeModal
            isOpen={showUpgradeModal}
            currentPlanId={billingStatus.planId}
            rendersUsed={billingStatus.rendersUsed}
            rendersAllowed={getPlan(billingStatus.planId).features.rendersPerMonth}
            onClose={() => setShowUpgradeModal(false)}
          />
        )}
      </div>
    </div>
    </ProtectedRoute>
  );
}
