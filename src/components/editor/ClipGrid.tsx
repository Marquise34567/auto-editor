import Image from "next/image";
import { GeneratedClip } from "@/lib/types";

type ClipGridProps = {
  clips: GeneratedClip[];
  onUseFinal: (clip: GeneratedClip) => void;
  onDownload: (clip: GeneratedClip) => void;
};

export default function ClipGrid({
  clips,
  onUseFinal,
  onDownload,
}: ClipGridProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Generated Clips</h3>
        <span className="text-sm text-white/50">{clips.length} results</span>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {clips.map((clip) => (
          <div
            key={clip.id}
            className="rounded-2xl border border-white/10 bg-black/40 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/60">
                {clip.duration.toFixed(1)}s · Score {clip.score}
              </span>
              <span className="text-xs text-white/40">{clip.id.slice(0, 6)}</span>
            </div>
            <div className="mt-3 aspect-[16/9] w-full overflow-hidden rounded-xl border border-white/10 bg-black/30">
              {clip.thumbnailPath ? (
                <Image
                  src={clip.thumbnailPath}
                  alt="clip thumbnail"
                  width={640}
                  height={360}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-white/40">
                  Preview
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={clip.outputPath}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/15 px-3 py-2 text-xs text-white/80"
              >
                Preview
              </a>
              <a
                href={clip.outputPath}
                download
                className="rounded-full border border-white/15 px-3 py-2 text-xs text-white/80"
                onClick={() => onDownload(clip)}
              >
                Download
              </a>
              <button
                onClick={() => onUseFinal(clip)}
                className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-black"
              >
                Use as Final
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
