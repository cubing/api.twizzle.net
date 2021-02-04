import { BlockMove, Sequence } from "cubing/alg";
import { Twisty3DCanvas, TwistyPlayer } from "cubing/twisty";
import { PuzzleID } from "./url-params-shim";
import { SwipeGrid, themes, ThemeType } from "./SwipeGrid";

// TODO
export const backViewLayouts = {
  none: true, // default
  "side-by-side": true,
  "top-right": true,
};
// TODO
export type BackViewLayout = keyof typeof backViewLayouts;

const DEFAULT_THEME: ThemeType = "transparent-grid";

export const moveMaps: Record<PuzzleID, string[][]> = {
  "3x3x3": [
    ["", "U'", "U2'", "L", "l", "u'", "L2", "M2", "/enter"],
    ["U", "", "U'", "B", "x'", "B'", "B2", "x2'", "B2'"],
    ["U2", "U", "", "u", "r'", "R'", "z'", "M2", "R2'"],
    ["L'", "B'", "u'", "", "y'", "y2'", "F'", "M", "F2"],
    ["l'", "x", "r", "y", "", "y'", "d'", "x'", "d"],
    ["u", "B", "R", "y2", "y", "", "F2'", "M", "F"],
    ["L2'", "B2'", "z", "F", "d", "F2", "", "D", "D2"],
    ["M2'", "x2", "M2'", "M'", "x", "M'", "D'", "", "D"],
    ["/space", "B2", "R2", "F2'", "d'", "F'", "D2'", "D'", ""],
  ],
  "2x2x2": [
    ["", "U'", "U2'", "L", "l", "u'", "L2", "M2", "/enter"],
    ["U", "", "U'", "B", "x'", "B'", "B2", "x2'", "B2'"],
    ["U2", "U", "", "u", "r'", "R'", "z'", "M2", "R2'"],
    ["L'", "B'", "u'", "", "y'", "y2'", "F'", "M", "F2"],
    ["l'", "x", "r", "y", "", "y'", "d'", "x'", "d"],
    ["u", "B", "R", "y2", "y", "", "F2'", "M", "F"],
    ["L2'", "B2'", "z", "F", "d", "F2", "", "D", "D2"],
    ["M2'", "x2", "M2'", "M'", "x", "M'", "D'", "", "D"],
    ["/space", "B2", "R2", "F2'", "d'", "F'", "D2'", "D'", ""],
  ],
  "4x4x4": [
    ["", "U'", "U2'", "L", "l", "u'", "L2", "2L2", "/enter"],
    ["U", "", "U'", "B", "Rv'", "B'", "B2", "Rv2'", "B2'"],
    ["U2", "U", "", "u", "r'", "R'", "Fv'", "2R2'", "R2'"],
    ["L'", "B'", "u'", "", "Uv'", "Uv2'", "F'", "2L", "F2"],
    ["l'", "Rv", "r", "Uv", "", "Uv'", "d'", "Lv", "d"],
    ["u", "B", "R", "Uv2", "Uv", "", "F2'", "2R'", "F"],
    ["L2'", "B2'", "Fv", "F", "d", "F2", "", "D", "D2"],
    ["2L2'", "Rv2", "2R2", "2L'", "Lv'", "2R", "D'", "", "D"],
    ["/space", "B2", "R2", "F2'", "d'", "F'", "D2'", "D'", ""],
  ],
  "5x5x5": [
    ["", "U'", "U2'", "L", "l", "u'", "L2", "2L2", "/enter"],
    ["U", "", "U'", "B", "Rv'", "B'", "B2", "Rv2'", "B2'"],
    ["U2", "U", "", "u", "r'", "R'", "Fv'", "2R2'", "R2'"],
    ["L'", "B'", "u'", "", "Uv'", "Uv2'", "F'", "2L", "F2"],
    ["l'", "Rv", "r", "Uv", "", "Uv'", "d'", "Lv", "d"],
    ["u", "B", "R", "Uv2", "Uv", "", "F2'", "2R'", "F"],
    ["L2'", "B2'", "Fv", "F", "d", "F2", "", "D", "D2"],
    ["2L2'", "Rv2", "2R2", "2L'", "Lv'", "2R", "D'", "", "D"],
    ["/space", "B2", "R2", "F2'", "d'", "F'", "D2'", "D'", ""],
  ],
  fto: [
    ["", "U'", "U2'", "L", "l", "u'", "L2", "2L2", "/enter"],
    ["U", "", "U'", "BL", "Rv'", "BR'", "BL2", "Rv2'", "BR2'"],
    ["U2", "U", "", "u", "r'", "R'", "Fv'", "2R2'", "R2'"],
    ["L'", "BL'", "u'", "", "Uv'", "Uv2'", "F'", "2L", "F2"],
    ["l'", "Rv", "r", "Uv", "", "Uv'", "d'", "Lv", "d"],
    ["u", "BR", "R", "Uv2", "Uv", "", "F2'", "2R'", "F"],
    ["L2'", "BL2'", "Fv", "F", "d", "F2", "", "D", "D"],
    ["2L2'", "Rv2", "2R2", "2L'", "Lv'", "2R", "D'", "", "D"],
    ["/space", "BR2", "R2", "F2'", "d'", "F'", "D'", "D'", ""],
  ],
  megaminx: [
    ["", "U'", "U2'", "L", "l", "u'", "L2", "2L2", "/enter"],
    ["U", "", "U'", "BL", "Rv'", "BR'", "BL2", "Rv2'", "BR2'"],
    ["U2", "U", "", "u", "r'", "R'", "Fv'", "2R2'", "R2'"],
    ["L'", "BL'", "u'", "", "Uv'", "Uv2'", "F'", "2L", "F2"],
    ["l'", "Rv", "r", "Uv", "", "Uv'", "d'", "Lv", "d"],
    ["u", "BR", "R", "Uv2", "Uv", "", "F2'", "2R'", "F"],
    ["L2'", "BL2'", "Fv", "F", "d", "F2", "", "FL", "D"],
    ["2L2'", "Rv2", "2R2", "2L'", "Lv'", "2R", "FL'", "", "FR"],
    ["/space", "BR2", "R2", "F2'", "d'", "F'", "D'", "FR'", ""],
  ],
};

export type Action = "space" | "enter";

export function actionToUIText(action: Action): string {
  return {
    space: "⏮",
    enter: "▶️",
  }[action];
}

function constructTwistyPlayer(puzzleName: PuzzleID): TwistyPlayer {
  let backView = new URL(document.location.href).searchParams.get(
    "back-view"
  ) as BackViewLayout | undefined;
  return new TwistyPlayer({
    alg: new Sequence([]),
    puzzle: puzzleName,
    controlPanel: "none",
    background: "none",
    backView,
    // experimentalStartSetup: getSetup(),
  });
}

export class SwipeyPuzzle extends HTMLElement {
  public twistyPlayer: TwistyPlayer;

  theme: ThemeType;

  constructor(
    private puzzleName: PuzzleID,
    private actionListener: (action: Action) => void,
    private algListener: () => void
  ) {
    super();
    this.twistyPlayer = constructTwistyPlayer(puzzleName);

    let theme: ThemeType = new URL(document.location.href).searchParams.get(
      "theme"
    ) as ThemeType | null;
    if (!themes.includes(theme)) {
      theme = DEFAULT_THEME;
    }
    this.theme = theme;
    console.log("Using theme:", this.theme);
  }

  public setActionListener(actionListener: (action: Action) => void) {
    this.actionListener = actionListener;
  }

  public setAlgListener(algListener: () => void): void {
    this.algListener = algListener;
  }

  protected connectedCallback() {
    this.appendChild(this.twistyPlayer);
    this.twistyPlayer.timeline.tempoScale = 3;

    if (this.puzzleName !== "3x3x3") {
      setTimeout(() => {
        const icon = (this.twistyPlayer
          .viewerElems[0] as Twisty3DCanvas).renderToDataURL({
          squareCrop: true,
        });
        console.log("Setting touch icon from canvas.");
        (document.querySelector(
          'link[rel="apple-touch-icon"]'
        ) as HTMLLinkElement).href = icon;
      }, 100);
    }
  }

  public showGrid(): void {
    const swipeGrid: SwipeGrid = new SwipeGrid(
      this.puzzleName,
      this.onMove.bind(this),
      (action: Action) => this.actionListener(action),
      true,
      this.theme === "grid-back" ? "blank" : this.theme
    );
    this.appendChild(swipeGrid);

    if (this.theme === "transparent-grid" || this.theme === "grid-back") {
      const swipeGridExtra: SwipeGrid = new SwipeGrid(
        this.puzzleName,
        this.onMove.bind(this),
        (action: Action) => this.actionListener(action),
        false,
        "transparent-grid-back"
      );
      this.prepend(swipeGridExtra);
    }
  }

  private onMove(move: BlockMove): void {
    this.addMove(move);
    this.algListener();
  }

  // TODO: move this somewhere better.
  public addMove(move: BlockMove): void {
    const oldAlg = this.twistyPlayer.alg;
    try {
      // TODO: allow`TwistyPlayer` to handle this directly.
      this.twistyPlayer.experimentalAddMove(move);
      this.twistyPlayer.cursor.setAlg(this.twistyPlayer.alg);
    } catch (e) {
      this.twistyPlayer.alg = oldAlg;
    }
  }
}

if (customElements) {
  customElements.define("swipey-puzzle", SwipeyPuzzle);
}
