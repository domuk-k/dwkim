# dwkim TUI QA Matrix

This matrix defines the minimum bar for a top-tier terminal chat product. Each row must be covered by either an automated gate, a focused manual smoke, or both before TUI-facing changes ship.

## Automated Gate

Run from `packages/dwkim/`:

```bash
bun run qa:tui
```

Run from the workspace root:

```bash
bun run qa:dwkim:tui
```

The gate covers:

- TUI frame and screen runtime unit tests
- Existing dwkim CLI tests
- TypeScript strict type check
- Production bundle build

## Matrix

| Area | Scenario | Expected quality bar | Evidence |
| --- | --- | --- | --- |
| Startup | API health succeeds after a cold Fly.io start | The first visible state is stable, no raw logs or flicker, then welcome appears | `PersonaApiClient.checkHealth` tests; manual `npx dwkim` smoke |
| Startup failure | API health fails or times out | User sees one concise error state; terminal cursor is restored on exit | Manual `DWKIM_API_URL=http://127.0.0.1:9 bun run dev` smoke |
| Frame layout | History, active screen, auxiliary panels, composer | Regions render in fixed order; composer uses one editor border, not stacked separators | `src/__tests__/tui/tuiFrame.test.ts` |
| Mode lifecycle | connecting -> welcome -> idle -> loading -> idle | Previous screen exits before next screen enters; stale components do not remain | `src/__tests__/tui/screenRuntime.test.ts` |
| Welcome | Starter questions and direct typing | Number shortcuts work; typing dismisses welcome and lands in composer | Manual TTY smoke |
| Composer | Free-text submit and slash commands | Editor keeps history, autocomplete remains available, empty submit is ignored | Existing state/client tests; manual TTY smoke |
| Streaming | Progress, tool calls, text deltas, done metadata | Progress disappears once content streams; tool calls do not overlap answer text | Existing stream parser tests; manual live query |
| Suggestions | Follow-up questions after an answer | Select list owns focus; typing dismisses suggestions and starts composer input | Manual TTY smoke |
| Elicitation | Visitor-type selection | Choice is captured once and sent with the next chat turn | Existing state behavior; manual live query |
| Sources | `s` toggles latest sourced answer | Sources panel mounts in auxiliary region and clears without stale lines | Manual sourced query |
| HITL prompts | Feedback and email collection | Prompts are modal enough to avoid composer collisions; dismiss routes back to idle | Manual TTY smoke |
| Cancellation | ESC during loading and Ctrl+C anywhere | In-flight stream aborts; state records cancellation; terminal exits cleanly | Manual live query |
| Visual polish | Narrow and wide terminals | No hard-coded width assumptions; text wraps inside frame regions | `TuiFrame` viewport unit test; manual resize smoke |

## Manual Smoke Script

1. Run `bun run dev`.
2. Confirm welcome layout is stable at ~80 columns.
3. Press `1`, wait for streaming, then press `s` if sources appear.
4. Submit `/status`, then `/clear`.
5. Start a long query and press `ESC`.
6. Resize terminal narrower and submit one more short query.
7. Exit with `Ctrl+C`; cursor should return to the next shell line.
