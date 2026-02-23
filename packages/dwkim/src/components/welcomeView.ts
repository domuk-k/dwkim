import {
  Image,
  type SelectItem,
  SelectList,
  type SelectListTheme,
  Text
} from '@mariozechner/pi-tui'
import { profileImage } from '../assets/profile.js'
import { STARTER_QUESTIONS } from '../state/types.js'
import { c } from '../ui/theme.js'

const selectListTheme: SelectListTheme = {
  selectedPrefix: (s: string) => c.lavender.bold(`› ${s}`),
  selectedText: (s: string) => c.lavender.bold(s),
  description: c.muted,
  scrollInfo: c.dim,
  noMatch: c.muted
}

const items: SelectItem[] = STARTER_QUESTIONS.map((q) => ({
  value: q,
  label: q
}))

export function createProfileImage(): Image {
  return new Image(
    profileImage.base64,
    profileImage.mimeType,
    { fallbackColor: c.muted },
    {
      maxWidthCells: 20,
      maxHeightCells: 8,
      filename: 'profile.png'
    }
  )
}

export function createWelcomeScopeText(): Text {
  const text = new Text('', 1, 0)
  text.setText(c.dim(c.muted('커리어, 기술, 프로젝트, 글에 대해 물어보세요.')))
  return text
}

export function createWelcomeSelectList(): SelectList {
  return new SelectList(items, STARTER_QUESTIONS.length, selectListTheme)
}

export function createWelcomeHintText(): Text {
  const text = new Text('', 1, 0)
  text.setText(c.dim(c.muted('↑↓ 선택 · enter 질문 · 또는 직접 입력')))
  return text
}
