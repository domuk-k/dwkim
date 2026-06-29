import type { AppState } from '../state/types.js'

type ScreenMode = AppState['mode']

export interface ScreenController {
  enter?: (state: AppState) => void
  update?: (prev: AppState, next: AppState) => void
  exit?: (state: AppState) => void
}

export class ScreenRuntime {
  constructor(
    private readonly screens: Record<ScreenMode, ScreenController>,
    private readonly afterRender: () => void
  ) {}

  render(prev: AppState, next: AppState): void {
    if (prev.mode !== next.mode) {
      this.screens[prev.mode].exit?.(prev)
      this.screens[next.mode].enter?.(next)
    } else {
      this.screens[next.mode].update?.(prev, next)
    }

    this.afterRender()
  }

  exit(state: AppState): void {
    this.screens[state.mode].exit?.(state)
    this.afterRender()
  }
}
