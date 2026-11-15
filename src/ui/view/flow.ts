/**
 * Flow state machine for the hunter UI (design A1).
 * Pure and total: malformed input never throws and returns the state unchanged.
 */

export type FlowStep = "home" | "bag" | "hunting" | "revealed" | "lost";

export interface Slots {
  readonly text: boolean;
  readonly image: boolean;
}

export interface FlowState {
  readonly step: FlowStep;
  readonly slots: Slots;
}

export type FlowEvent =
  | { readonly kind: "open-bag" }
  | { readonly kind: "close-bag" }
  | { readonly kind: "toggle"; readonly slot: "text" | "image" }
  | { readonly kind: "confirm"; readonly canConfirm: boolean }
  | { readonly kind: "ready" }
  | { readonly kind: "fail" }
  | { readonly kind: "again" };

const INITIAL_SLOTS: Slots = { text: true, image: false };

export function flowReducer(state: FlowState, event: FlowEvent): FlowState {
  try {
    const kind = event.kind;
    switch (state.step) {
      case "home":
        if (kind === "open-bag") {
          return { step: "bag", slots: INITIAL_SLOTS };
        }
        return state;
      case "bag":
        if (kind === "close-bag") {
          return { step: "home", slots: state.slots };
        }
        if (kind === "toggle") {
          if (event.slot === "text") {
            return { step: "bag", slots: { ...state.slots, text: !state.slots.text } };
          }
          if (event.slot === "image") {
            return { step: "bag", slots: { ...state.slots, image: !state.slots.image } };
          }
          return state;
        }
        if (kind === "confirm" && event.canConfirm === true) {
          return { step: "hunting", slots: state.slots };
        }
        return state;
      case "hunting":
        if (kind === "ready") return { step: "revealed", slots: state.slots };
        if (kind === "fail") return { step: "lost", slots: state.slots };
        return state;
      case "revealed":
      case "lost":
        if (kind === "again") {
          return { step: "home", slots: INITIAL_SLOTS };
        }
        return state;
      default:
        return state;
    }
  } catch {
    return state;
  }
}

export function canConfirm(slots: Slots, text: string, file: File | null): boolean {
  try {
    const textOk =
      slots.text === true && typeof text === "string" && text.trim() !== "";
    const imageOk = slots.image === true && file !== null && file !== undefined;
    return textOk || imageOk;
  } catch {
    return false;
  }
}

export function shouldSubmitOnEnter(e: {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
  canConfirm: boolean;
}): boolean {
  try {
    return (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.isComposing &&
      e.canConfirm === true
    );
  } catch {
    return false;
  }
}
