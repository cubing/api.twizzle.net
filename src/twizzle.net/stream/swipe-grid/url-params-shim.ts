
const puzzleIDs = {
  "2x2x2": true,
  "3x3x3": true,
  "4x4x4": true,
  "5x5x5": true,
  fto: true,
  megaminx: true,
};
export type PuzzleID = keyof typeof puzzleIDs;


// Trick from https://github.com/microsoft/TypeScript/issues/28046#issuecomment-480516434
export type StringListAsType<
  T extends ReadonlyArray<unknown>
> = T extends ReadonlyArray<infer StringListAsType> ? StringListAsType : never;
