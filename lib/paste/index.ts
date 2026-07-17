/** Shared paste fragment codec (isomorphic). Client/server compressors are separate. */
export {
  isPasteFragment,
  isPasteMode,
  buildFragment,
  parseFragment,
} from "@/lib/paste/fragment";
export {
  selectPayload,
  fragmentFromPayload,
  readFragmentPayload,
  textToUtf8,
  utf8ToText,
} from "@/lib/paste/codec";
