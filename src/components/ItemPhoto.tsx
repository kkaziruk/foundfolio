import { ImageOff, Lock } from "lucide-react";

interface ItemPhotoProps {
  photoUrl: string | null | undefined;
  isSensitive: boolean;
  alt?: string;
  className?: string;
  imgClassName?: string;
}

export default function ItemPhoto({ photoUrl, isSensitive, alt = "Item photo", className = "", imgClassName = "w-full h-full object-cover" }: ItemPhotoProps) {
  if (isSensitive) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1.5 bg-slate-800 ${className}`}>
        <div className="flex items-center justify-center rounded-full bg-slate-700 p-2.5">
          <Lock className="w-5 h-5 text-slate-300" />
        </div>
        <span className="text-[10px] font-semibold text-slate-400 tracking-wide uppercase">Protected</span>
      </div>
    );
  }

  if (!photoUrl) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1.5 bg-slate-100 ${className}`}>
        <div className="flex items-center justify-center rounded-full bg-slate-200 p-2.5">
          <ImageOff className="w-5 h-5 text-slate-400" />
        </div>
        <span className="text-[10px] font-semibold text-slate-400 tracking-wide uppercase">No photo</span>
      </div>
    );
  }

  return <img src={photoUrl} alt={alt} className={imgClassName} loading="lazy" />;
}
