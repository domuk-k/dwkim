---
"blog": patch
---

Add interactive animations to theme toggle component

- Add ripple wave effect on click: circles animate sequentially with 100ms delay
- Add individual hover effect: only hovered circle scales to 1.2x
- Remove global hover opacity change in favor of per-circle interactions
- Smooth transitions with proper timing and easing functions