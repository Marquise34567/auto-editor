import { ChangeEvent } from "react";
import { GenerateSettings } from "@/lib/types";

type EditorControlsProps = {
  title: string;
  onTitleChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenCrop: () => void;
  settings: GenerateSettings;
  onSettingsChange: (next: GenerateSettings) => void;
  locked: boolean;
};

export default function EditorControls({
  title,
  onTitleChange,
  onFileChange,
  settings,
  onSettingsChange,
  locked,
}: EditorControlsProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <label className="text-xs uppercase tracking-[0.2em] text-white/40">
          Project Title
        </label>
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          className="mt-3 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/40"
          placeholder="Creator sprint cut"
        />
        <div className="mt-4">
          <label className="block text-xs text-white/50 mb-2">
            Video File (one at a time)
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={onFileChange}
            disabled={locked}
            className="block w-full text-sm text-white/70 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-white disabled:opacity-50 file:cursor-pointer cursor-pointer"
          />
          {locked && (
            <p className="mt-2 text-xs text-amber-400/70">
              Processing in progress. Please wait to upload a new video.
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
