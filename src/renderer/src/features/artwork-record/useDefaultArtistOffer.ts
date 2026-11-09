import { useEffect, useState } from "react";

/**
 * While the settings have no default artist, offers to keep the one typed
 * in a record as the default. Checked unless the user unticks it.
 */
export function useDefaultArtistOffer(artist: string) {
  const [hasDefault, setHasDefault] = useState(true);
  const [isChosen, setIsChosen] = useState(true);

  useEffect(() => {
    // Without the settings nothing is offered, which is the safe side.
    window.artGallery.getSettings().then(
      ({ defaultArtist }) => setHasDefault(defaultArtist !== ""),
      () => {},
    );
  }, []);

  const isOffered = !hasDefault && artist.trim() !== "";
  return {
    isOffered,
    isChosen,
    setIsChosen,
    /** Saves `savedArtist` as the default if it was offered and chosen. */
    apply: async (savedArtist: string | null) => {
      if (!isOffered || !isChosen || !savedArtist) return;
      await window.artGallery.updateSettings({ defaultArtist: savedArtist });
      setHasDefault(true);
    },
  };
}
