import { type SelectItem, SelectList, type SelectListTheme } from '@mariozechner/pi-tui'
import { c } from '../ui/theme.js'

const selectListTheme: SelectListTheme = {
  selectedPrefix: (s: string) => c.lavender.bold(`› ${s}`),
  selectedText: (s: string) => c.lavender.bold(s),
  description: c.muted,
  scrollInfo: c.dim,
  noMatch: c.muted
}

export function createSuggestedQuestionsView(questions: string[]): SelectList {
  const items: SelectItem[] = questions.map((q) => ({
    value: q,
    label: q
  }))
  return new SelectList(items, questions.length, selectListTheme)
}

// elicitation chip: label은 사람이 보고, value(visitorType)는 선택 시 회수된다
export function createElicitationView(options: { value: string; label: string }[]): SelectList {
  const items: SelectItem[] = options.map((o) => ({ value: o.value, label: o.label }))
  return new SelectList(items, options.length, selectListTheme)
}
