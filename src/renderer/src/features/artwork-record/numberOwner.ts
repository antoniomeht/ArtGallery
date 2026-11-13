import type { InventoryNumberOwner } from "../../../../shared/inventoryNumbers";

export function ownerText({ title, inTrash }: InventoryNumberOwner): string {
  return `Este número lo tiene «${title}»${inTrash ? " (en la papelera)" : ""}.`;
}

/** What the other artwork gets when the two swap numbers on saving. */
export function swapText(
  { title }: InventoryNumberOwner,
  previous: string | null,
): string {
  return previous
    ? `Al guardar, «${title}» pasará a tener el ${previous}.`
    : `Al guardar, «${title}» se quedará sin número.`;
}
