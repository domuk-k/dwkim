import type { Component } from '@mariozechner/pi-tui'

type FrameRegion = 'history' | 'main' | 'auxiliary' | 'composer'

const REGION_ORDER: FrameRegion[] = ['history', 'main', 'auxiliary', 'composer']

/**
 * Owns the terminal's spatial model.
 *
 * Screens mount named slots into semantic regions instead of pushing components
 * directly into the root TUI tree.
 */
export class TuiFrame implements Component {
  private readonly regions = new Map<FrameRegion, Map<string, Component[]>>()

  constructor() {
    for (const region of REGION_ORDER) {
      this.regions.set(region, new Map())
    }
  }

  setSlot(region: FrameRegion, slot: string, components: Component[]): void {
    this.regions.get(region)?.set(slot, components)
    this.invalidate()
  }

  clearSlot(region: FrameRegion, slot: string): void {
    this.regions.get(region)?.delete(slot)
    this.invalidate()
  }

  clearRegion(region: FrameRegion): void {
    this.regions.get(region)?.clear()
    this.invalidate()
  }

  hasSlot(region: FrameRegion, slot: string): boolean {
    return this.regions.get(region)?.has(slot) ?? false
  }

  invalidate(): void {
    for (const slots of this.regions.values()) {
      for (const components of slots.values()) {
        for (const component of components) {
          component.invalidate?.()
        }
      }
    }
  }

  render(width: number): string[] {
    const lines: string[] = []

    for (const region of REGION_ORDER) {
      const regionLines = this.renderRegion(region, width)
      if (regionLines.length === 0) continue

      if (lines.length > 0 && region !== 'composer') {
        lines.push('')
      }
      lines.push(...regionLines)
    }

    return lines
  }

  private renderRegion(region: FrameRegion, width: number): string[] {
    const slots = this.regions.get(region)
    if (!slots || slots.size === 0) return []

    const lines: string[] = []
    for (const components of slots.values()) {
      for (const component of components) {
        lines.push(...component.render(width))
      }
    }
    return lines
  }
}
