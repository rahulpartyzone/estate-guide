import { Box, PlayCircle } from "lucide-react";
import { Txt, text, useText } from "@/content/siteText";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** YouTube video id from watch, youtu.be, shorts, embed or live links. */
export function youtubeId(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]{6,})/);
      if (m) return m[2];
    }
  } catch {
    /* not a URL */
  }
  return null;
}

/** Walkthrough video (embedded when it's YouTube) and a link to the 3D / 360° virtual tour. */
const ProjectMedia = ({ name, videoUrl, virtualTourUrl }: { name: string; videoUrl?: string; virtualTourUrl?: string }) => {
  useText();
  if (!videoUrl && !virtualTourUrl) return null;
  const yt = youtubeId(videoUrl);
  return (
    <Card className="p-6 space-y-4">
      <Txt k="project.gallery.mediaTitle" as="h2" className="text-2xl font-bold text-foreground" />
      {yt ? (
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}?rel=0`}
            title={`${name} walkthrough video`}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      ) : videoUrl ? (
        <a href={videoUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="gap-2"><PlayCircle className="h-5 w-5" /> {text("project.gallery.watchVideo")}</Button>
        </a>
      ) : null}
      {virtualTourUrl && (
        <a href={virtualTourUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
          <Button className="gap-2"><Box className="h-5 w-5" /> {text("project.gallery.openTour")}</Button>
        </a>
      )}
    </Card>
  );
};

export default ProjectMedia;
