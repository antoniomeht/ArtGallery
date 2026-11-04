import { X } from "lucide-react";
import { IconButton } from "./IconButton";

export interface NoticeAction {
  message: string;
  /** Offered as "Deshacer" when the action can be reverted. */
  undo?: () => Promise<void>;
}

interface ActionNoticeProps {
  action: NoticeAction | null;
  onDismiss: () => void;
}

/**
 * Confirms an action that just happened. The live region is always rendered
 * so screen readers announce each new message.
 */
export function ActionNotice({ action, onDismiss }: ActionNoticeProps) {
  const undo = action?.undo;

  return (
    <div className="notice-region" role="status">
      {action && (
        <div className="notice">
          <span>{action.message}</span>
          {undo && (
            <button
              type="button"
              className="notice__action"
              onClick={async () => {
                await undo();
                onDismiss();
              }}
            >
              Deshacer
            </button>
          )}
          <IconButton
            className="notice__close"
            aria-label="Cerrar aviso"
            onClick={onDismiss}
          >
            <X aria-hidden size={16} />
          </IconButton>
        </div>
      )}
    </div>
  );
}
