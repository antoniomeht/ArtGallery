import { useCallback, useState } from "react";
import type { NoticeAction } from "../components/ActionNotice";

/**
 * Holds the notice shown after an action and offers the actions that every
 * artwork list shares, such as moving to the trash with undo.
 */
export function useActionNotice(reload: () => void) {
  const [notice, setNotice] = useState<NoticeAction | null>(null);

  const moveToTrash = useCallback(
    async (ids: string[], message: string) => {
      await window.artGallery.moveToTrash(ids);
      setNotice({
        message,
        undo: async () => {
          await window.artGallery.restoreFromTrash(ids);
          reload();
        },
      });
      reload();
    },
    [reload],
  );

  return { notice, setNotice, moveToTrash };
}
