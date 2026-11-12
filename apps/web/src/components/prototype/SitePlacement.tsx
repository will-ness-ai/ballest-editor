/**
 * PROTOTYPE (grill-design round 1: where ballestrecords.com's prefabs sit in the Prefabs panel). Never merged: the
 * winner is rebuilt properly. `?variant=A..E` picks one; the picker bottom-right and the ←/→ keys cycle them.
 */
import type { SitePrefab } from "@ballest/contracts"
import { IconChevronLeft, IconChevronRight, IconDots, IconWorld } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group"
import { type ReactNode, useEffect, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { placeSitePrefab } from "../../editor/actions"
import { SectionTitle } from "../SectionTitle"
import {
  SiteAccountButton,
  SiteGalleryBody,
  SiteHeading,
  SitePrefabMenuItems,
  SiteThumbnail,
  useSiteGallery
} from "../SitePrefabs"

export const VARIANTS = [
  ["A", "Top", "The ballestrecords.com section moves above Project and Game. Nothing else changes."],
  [
    "B",
    "Tabs",
    "A Yours / ballestrecords.com switch under the filter shows one list at a time; the filter searches the one showing."
  ],
  [
    "C",
    "Split",
    "The panel splits into two halves that scroll on their own: your tiers above, the site below, its head always in view."
  ],
  [
    "D",
    "Shelf",
    "A strip of the site's top prefabs as big thumbnails sits above your tiers; See all opens the whole gallery in the panel, with Back."
  ],
  [
    "E",
    "Gallery window",
    "The panel lists only your tiers, plus a Browse button that opens the site's gallery as big cards in a window over the editor."
  ]
] as const
type Variant = (typeof VARIANTS)[number][0]

const variantOfUrl = (): Variant => {
  const asked = new URLSearchParams(location.search).get("variant")
  return VARIANTS.find(([key]) => key === asked)?.[0] ?? "A"
}
let current: Variant = variantOfUrl()
const listeners = new Set<() => void>()
const setVariant = (next: Variant) => {
  current = next
  const url = new URL(location.href)
  url.searchParams.set("variant", next)
  history.replaceState(history.state, "", url)
  for (const listener of listeners) listener()
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}
export const useVariant = () => useSyncExternalStore(subscribe, () => current)

const step = (by: number) => {
  const at = VARIANTS.findIndex(([key]) => key === current)
  setVariant(VARIANTS[(at + by + VARIANTS.length) % VARIANTS.length]![0])
}

/** The round's picker: plainly not part of the design. */
export function ProtoPicker() {
  const variant = useVariant()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target
      if (target instanceof HTMLElement && (target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(target.tagName))) {
        return
      }
      if (e.key === "ArrowLeft" && e.altKey) step(-1)
      if (e.key === "ArrowRight" && e.altKey) step(1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
  const [, name] = VARIANTS.find(([key]) => key === variant)!
  return createPortal(
    <div
      data-variants={JSON.stringify(VARIANTS)}
      className="fixed right-4 bottom-10 z-[2147483647] flex items-center gap-1 rounded-full border-2 border-black bg-yellow-300 px-2 py-1 font-mono text-sm text-black shadow-xl"
    >
      <button type="button" className="px-1" aria-label="Previous variant" onClick={() => step(-1)}>
        <IconChevronLeft className="size-4" />
      </button>
      <span className="px-1 font-bold">PROTOTYPE {variant} · {name}</span>
      <button type="button" className="px-1" aria-label="Next variant" onClick={() => step(1)}>
        <IconChevronRight className="size-4" />
      </button>
    </div>,
    document.body
  )
}

/** A big card: thumbnail, name, uploader. A click places it; ⋮ has the rest. */
function SiteCard({ prefab, wide }: { readonly prefab: SitePrefab; readonly wide?: boolean }) {
  return (
    <li className={wide === true ? "min-w-0" : "w-24 shrink-0"}>
      <div className="group relative flex flex-col gap-1 rounded-control p-1 transition-colors hover:bg-hover active:bg-pressed">
        <button
          type="button"
          title={prefab.description === "" ? prefab.name : prefab.description}
          className="flex flex-col gap-1 text-left focus-visible:outline-none"
          onClick={(e) => {
            if (e.detail !== 0) void placeSitePrefab(prefab)
          }}
        >
          <SiteThumbnail slug={prefab.slug} size={wide === true ? "aspect-square w-full" : "size-22"} />
          <span className="truncate text-body">{prefab.name}</span>
          <span className="truncate text-caption text-fg-tertiary">
            {prefab.uploader.name} · {prefab.pieces}
          </span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`More for ${prefab.name}`}
                className="absolute top-1 right-1 size-6 bg-card/80 opacity-0 group-hover:opacity-100"
              />
            }
          >
            <IconDots />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <SitePrefabMenuItems prefab={prefab} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}

const Scroll = ({ children }: { readonly children: ReactNode }) => (
  <ScrollArea className="min-h-0 flex-1">
    <div className="flex flex-col gap-3">{children}</div>
  </ScrollArea>
)

function SiteSection({ query }: { readonly query: string }) {
  const site = useSiteGallery(query)
  return (
    <section className="flex flex-col gap-1">
      <SiteHeading />
      <SiteGalleryBody query={query} site={site} />
    </section>
  )
}

function Tabs({ query, tiers }: { readonly query: string; readonly tiers: ReactNode }) {
  const [tab, setTab] = useState<"yours" | "site">("yours")
  const site = useSiteGallery(query)
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <ToggleGroup
          value={[tab]}
          onValueChange={([picked]) => {
            if (picked === "yours" || picked === "site") setTab(picked)
          }}
        >
          <ToggleGroupItem value="yours">Yours</ToggleGroupItem>
          <ToggleGroupItem value="site">ballestrecords.com</ToggleGroupItem>
        </ToggleGroup>
        {tab === "site" && <SiteAccountButton />}
      </div>
      <Scroll>
        {tab === "yours" ? tiers : <SiteGalleryBody query={query} site={site} />}
      </Scroll>
    </>
  )
}

function Split({ query, tiers }: { readonly query: string; readonly tiers: ReactNode }) {
  const site = useSiteGallery(query)
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <Scroll>{tiers}</Scroll>
      <div className="flex min-h-0 flex-1 flex-col gap-1 border-t border-border/70 pt-2">
        <SiteHeading />
        <Scroll>
          <SiteGalleryBody query={query} site={site} />
        </Scroll>
      </div>
    </div>
  )
}

function Shelf({ query, tiers }: { readonly query: string; readonly tiers: ReactNode }) {
  const site = useSiteGallery(query)
  const [all, setAll] = useState(false)
  if (all) {
    return (
      <>
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setAll(false)}>
            <IconChevronLeft /> Back
          </Button>
          <SiteAccountButton />
        </div>
        <Scroll>
          <SiteGalleryBody query={query} site={site} />
        </Scroll>
      </>
    )
  }
  const { gallery } = site
  return (
    <Scroll>
      <section className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2 px-2">
          <SectionTitle>ballestrecords.com</SectionTitle>
          <Button variant="link" className="h-auto border-0 px-0 text-caption" onClick={() => setAll(true)}>
            See all{gallery._tag === "Loaded" ? ` ${gallery.page.total}` : ""}
          </Button>
        </div>
        {gallery._tag === "Loaded" && gallery.page.prefabs.length > 0
          ? (
            <ScrollArea className="w-full">
              <ul className="flex gap-1 pb-2">
                {gallery.page.prefabs.slice(0, 10).map((prefab) => <SiteCard key={prefab.slug} prefab={prefab} />)}
              </ul>
            </ScrollArea>
          )
          : <SiteGalleryBody query={query} site={site} />}
      </section>
      {tiers}
    </Scroll>
  )
}

function GalleryWindow({ tiers }: { readonly tiers: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const site = useSiteGallery(query)
  const { gallery } = site
  return (
    <>
      <Button variant="outline" size="sm" className="justify-start" onClick={() => setOpen(true)}>
        <IconWorld /> Browse ballestrecords.com…
      </Button>
      <Scroll>{tiers}</Scroll>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[80vh] flex-col sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>ballestrecords.com</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              type="search"
              placeholder="Search players' prefabs…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <SiteAccountButton />
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {gallery._tag === "Loaded" && gallery.page.prefabs.length > 0
              ? (
                <ul
                  className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2"
                  onClick={(e) => {
                    if (e.target instanceof HTMLElement && e.target.closest("button[title]") !== null) setOpen(false)
                  }}
                >
                  {gallery.page.prefabs.map((prefab) => <SiteCard key={prefab.slug} prefab={prefab} wide />)}
                </ul>
              )
              : <SiteGalleryBody query={query} site={site} />}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Everything under the filter, per variant. */
export function ProtoPanelBody({ query, tiers }: { readonly query: string; readonly tiers: ReactNode }) {
  const variant = useVariant()
  switch (variant) {
    case "A":
      return (
        <Scroll>
          <SiteSection query={query} />
          {tiers}
        </Scroll>
      )
    case "B":
      return <Tabs query={query} tiers={tiers} />
    case "C":
      return <Split query={query} tiers={tiers} />
    case "D":
      return <Shelf query={query} tiers={tiers} />
    case "E":
      return <GalleryWindow tiers={tiers} />
  }
}

// END PROTOTYPE
