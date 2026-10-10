import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

type StorefrontProps = {
  open: boolean;
  /** Text on the sign above the awning. */
  sign?: string;
  /** Door notice; defaults to OPEN / CLOSED from `open`. */
  notice?: string;
};

/**
 * The shop building with its step and planter, for use inside a `.stage3d`.
 * All geometry lives in globals.css under `.scene`; the `.scene.off` state dims it.
 * Shared by the home hero and the onboarding scenes so there is one storefront.
 */
export function Storefront({ open, sign = "dukkan", notice }: StorefrontProps) {
  return (
    <>
      <div className="shop">
        <div className="face top" />
        <div className="face right" />
        <div className="face front">
          <span className="shop-sign">
            <i dir="auto">{sign}</i>
            <span />
          </span>
          <span className="awning" />
          <span className="shop-window">
            <span className="shop-stock">
              <i />
              <i />
              <i />
            </span>
            <span className="shop-stock lower">
              <i />
              <i />
              <i />
            </span>
          </span>
          <span className="doorway" />
          <span className="door">
            <span className="door-notice">{notice ?? (open ? "OPEN" : "CLOSED")}</span>
            <span className="door-handle" />
          </span>
          <span className="baseline" />
        </div>
      </div>
      <span className="shop-step" />
      <span className="door-light" />
      <span className="shop-planter">
        <i />
        <i />
        <i />
      </span>
    </>
  );
}

/** Distance from an agent's origin down to the floor, for its ground shadow. */
export function shadowAt(px: number) {
  return { "--sy": `${px}px` } as CSSProperties;
}

/**
 * A small lime "bot" (body, two eyes, antenna) with an optional speech bubble:
 * three dots while browsing, a lime check once paid. Styled by `.bot` in globals.css.
 */
export function Bot({ small, say }: { small?: boolean; say?: "think" | "paid" }) {
  return (
    <span className={cn("bot", small && "sm")}>
      <i className="ant" />
      <i className="eye l" />
      <i className="eye r" />
      {say === "think" && (
        <span className="say think">
          <i />
          <i />
          <i />
        </span>
      )}
      {say === "paid" && <span className="say paid" />}
    </span>
  );
}
