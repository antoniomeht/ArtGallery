import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Field } from "../../components/Field";
import {
  applySuggestion,
  currentTerm,
  isSameText,
  otherListValues,
  rankSuggestions,
} from "./suggestions";

interface SuggestFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Values already used in the inventory. */
  suggestions: readonly string[];
  /** The field holds a comma-separated list and suggests its last item. */
  isList?: boolean;
  hint?: string;
  error?: string;
}

/**
 * Text field offering the values already used. Enter takes the closest match,
 * and any other text can still be typed freely.
 */
export function SuggestField({
  value,
  onChange,
  suggestions,
  isList = false,
  ...fieldProps
}: SuggestFieldProps) {
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  /** Until the user types, every value is on offer, whatever the field holds. */
  const [hasTyped, setHasTyped] = useState(false);

  const term = hasTyped ? currentTerm(value, isList) : "";
  const taken = isList ? otherListValues(value) : [];
  const matches = rankSuggestions(
    term,
    suggestions.filter(
      (item) => !taken.some((other) => isSameText(other, item)),
    ),
  );
  // Nothing to offer once the field already says the only match.
  const isSettled = matches.length === 1 && isSameText(matches[0] ?? "", term);
  const isShown = isOpen && matches.length > 0 && !isSettled;
  // While typing, Enter takes the closest match, so it is highlighted.
  const hasTerm = term.trim() !== "";
  const highlighted = activeIndex >= 0 ? activeIndex : hasTerm ? 0 : -1;
  const optionId = (index: number) => `${listId}-${index}`;

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [highlighted, isShown]);

  function choose(match: string) {
    onChange(applySuggestion(value, match, isList));
    setActiveIndex(-1);
    setHasTyped(false);
    // A list goes on: the next item can be typed straight away.
    setIsOpen(isList);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!isShown) {
      if (event.key === "ArrowDown") setIsOpen(true);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((highlighted + step + matches.length) % matches.length);
    } else if (event.key === "Enter") {
      const match = matches[highlighted];
      if (match !== undefined) {
        // Takes the value instead of submitting the form.
        event.preventDefault();
        choose(match);
      }
    } else if (event.key === "Escape") {
      // Closes the list only, not the record behind it.
      event.preventDefault();
      setIsOpen(false);
    }
  }

  return (
    <div className="suggest">
      <Field
        {...fieldProps}
        value={value}
        onChange={(next) => {
          onChange(next);
          setActiveIndex(-1);
          setHasTyped(true);
          setIsOpen(true);
        }}
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={isShown}
        aria-controls={listId}
        aria-activedescendant={
          isShown && highlighted >= 0 ? optionId(highlighted) : undefined
        }
        onFocus={() => {
          setHasTyped(false);
          setIsOpen(true);
        }}
        onBlur={() => setIsOpen(false)}
        onKeyDown={handleKeyDown}
      />
      {isShown && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={fieldProps.label}
          className="suggest__list"
        >
          {matches.map((match, index) => (
            <li
              key={match}
              id={optionId(index)}
              role="option"
              aria-selected={index === highlighted}
              className="suggest__option"
              // Keeps the focus in the field, which would otherwise close this.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(match)}
            >
              {match}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
