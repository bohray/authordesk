import { Wordmark } from "@/components/brand/Logo";
import { loginHighlights } from "@/constants/auth";

/**
 * Ruled-paper brand panel beside the login form (lg+ only).
 *
 * `paper-texture` draws a rule every 28px from the top, so every size, line-height and gap
 * below is a multiple of 28px (one "row") and blocks are stacked from the top (no
 * justify-between / centering, whose offsets depend on the viewport height). That keeps each
 * line of text sitting in its own ruled row.
 */
export function LoginShowcase() {
  return (
    <aside className="paper-texture relative hidden flex-col overflow-hidden border-r px-10 py-[56px] lg:flex xl:px-14">
      <Wordmark
        className="h-[28px] gap-3"
        textClassName="text-2xl leading-[28px]"
        markClassName="size-[28px]"
      />
      <div className="mt-[168px] max-w-lg xl:mt-[224px]">
        <p className="text-xs leading-[28px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
          Author support portal
        </p>
        <p className="mt-[28px] font-heading text-4xl leading-[56px] font-semibold tracking-tight text-balance xl:text-5xl">
          Support for every author, <span className="text-primary italic">at scale.</span>
        </p>
        <ul className="mt-[56px] flex flex-col gap-[28px] text-sm leading-[28px] text-muted-foreground">
          {loginHighlights.map(({ icon: Icon, text }) => (
            <li key={text} className="flex h-[28px] items-center gap-3">
              <span className="flex size-[28px] shrink-0 items-center justify-center rounded-md bg-card text-primary shadow-card ring-1 ring-border">
                <Icon className="size-3.5" aria-hidden />
              </span>
              {text}
            </li>
          ))}
        </ul>
        <p className="mt-[112px] text-xs leading-[28px] text-muted-foreground">
          Every manuscript deserves a good reply.
        </p>
      </div>
    </aside>
  );
}
