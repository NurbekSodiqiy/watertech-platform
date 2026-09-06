# DESIGN LOCK — Never break this, no matter what task you're given

This rule applies to EVERY task, regardless of what content, text, or data you're asked to add or edit. Read this before making any change.

## The rule

Whatever content you add, edit, or generate — it must render using the site's EXISTING design system, colors, components, and light/dark theme. You are never adding new visual styling, new colors, new components, or a different look. You are only ever filling existing containers with content.

## The color system (locked — never introduce different colors)

Light mode:
```
--bg:             #EDF3F9
--surface:        #FFFFFF
--surface-alt:    #F8FBFE
--border:         #DCE6F0
--text-primary:   #1E3A5F
--text-secondary: #5B7086
--accent:         #3D5A80
--accent-hover:   #2E4763
```

Dark mode:
```
--bg:             #121C30
--surface:        #1B2740
--surface-alt:    #202E4B
--border:         #2A3B58
--text-primary:   #EFF4FA
--text-secondary: #9FB2CC
--accent:         #7FA8D9
--accent-hover:   #9DBEE6
```

These are the ONLY colors that exist in this project. Every element you touch must use these existing CSS variables / Tailwind semantic classes (`bg-background`, `bg-surface`, `text-primary`, `text-secondary`, `border-border`, `accent`) — never a hardcoded hex value, never a color outside this list, never a Tailwind default color (no `bg-blue-500`, no `text-gray-700`, no `bg-white` as a literal — always the semantic token).

## What "adding content" means here

When you add or edit content on any page:
- Reuse the existing components already built for that content type (cards, tables, badges, script templates, etc.) — do not invent a new visual container.
- The new content must look indistinguishable in style from the surrounding content already on the page — same spacing, same border-radius, same shadow, same typography weight.
- It must render correctly and consistently in BOTH light mode and dark mode, with no exceptions. Before finishing any task, mentally (or actually) check both themes.
- Never add inline styles, new CSS classes, or new component variants to accommodate content — if the content doesn't fit an existing component well, use the closest existing one rather than creating a new visual pattern.

## What you must NEVER do, under any circumstances

- Never change colors, spacing, shadows, border-radius, or typography anywhere in the codebase.
- Never touch `Sidebar`, `TopBar`, `AppShell`, or any shared layout component.
- Never add a new design pattern, new card style, or new color accent "because it looks nice for this content."
- Never change light/dark mode logic or theme tokens.

## If you're unsure

If a task seems to require a visual change to satisfy it (not just filling content into what already exists), stop and flag it instead of proceeding — do not improvise a design decision.
