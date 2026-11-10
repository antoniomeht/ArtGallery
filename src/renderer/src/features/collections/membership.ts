export interface Membership {
  /** Whether all, some or none of the selection is in the collection. */
  state: "all" | "some" | "none";
  /** How many selected artworks are in it. */
  count: number;
}

export function membershipState(
  selectedIds: readonly string[],
  memberIds: ReadonlySet<string>,
): Membership {
  const count = selectedIds.filter((id) => memberIds.has(id)).length;
  const state =
    count === 0 ? "none" : count === selectedIds.length ? "all" : "some";
  return { state, count };
}
