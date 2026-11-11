import { useEffect, useState } from "react";
import {
  hiddenFieldsSchema,
  type HiddenFields,
} from "../../../shared/categoryFields";

/** Which fields each category leaves out, as chosen in the settings. */
export function useHiddenFields(): HiddenFields {
  // The defaults apply until the settings are read, or if they cannot be.
  const [rules, setRules] = useState(() => hiddenFieldsSchema.parse(undefined));

  useEffect(() => {
    window.artGallery.getSettings().then(
      ({ hiddenFields }) => setRules(hiddenFields),
      () => {},
    );
  }, []);

  return rules;
}
