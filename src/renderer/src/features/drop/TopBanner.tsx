import { AlertCircle, CheckCircle2, X } from "lucide-react";
import type { CSSProperties } from "react";
import { useNavigation } from "../../components/Navigation";
import { BANNER_MS, type useTopBanner } from "./useTopBanner";
import "./drop.css";

interface TopBannerProps {
  topBanner: ReturnType<typeof useTopBanner>;
}

/** Green when everything was added, red when something was not. */
export function TopBanner({ topBanner }: TopBannerProps) {
  const { banner, dismiss, setIsHeld } = topBanner;
  const { showDocuments } = useNavigation();

  // The live region stays in place so every new message is announced.
  return (
    <div
      className="top-banner-region"
      role={banner?.tone === "error" ? "alert" : "status"}
    >
      {banner && (
        <div
          key={banner.key}
          className={`top-banner top-banner--${banner.tone}`}
          style={
            { "--banner-ms": `${BANNER_MS[banner.tone]}ms` } as CSSProperties
          }
          onMouseEnter={() => setIsHeld(true)}
          onMouseLeave={() => setIsHeld(false)}
          onFocus={() => setIsHeld(true)}
          onBlur={() => setIsHeld(false)}
        >
          {banner.tone === "success" ? (
            <CheckCircle2 aria-hidden size={18} />
          ) : (
            <AlertCircle aria-hidden size={18} />
          )}
          <span className="top-banner__message">{banner.message}</span>
          {banner.result && banner.result.added.length > 0 && (
            <button
              type="button"
              className="top-banner__action"
              onClick={() => {
                const [only] = banner.result?.added ?? [];
                showDocuments(
                  banner.result?.added.length === 1 && only
                    ? { openId: only.id }
                    : {},
                );
                dismiss();
              }}
            >
              Ver
            </button>
          )}
          <button
            type="button"
            className="top-banner__close"
            aria-label="Cerrar aviso"
            onClick={dismiss}
          >
            <X aria-hidden size={16} />
          </button>
          <span className="top-banner__timer" aria-hidden />
        </div>
      )}
    </div>
  );
}
