import Link from "next/link";

export function Logo({ inverse = false, href = "/" }: { inverse?: boolean; href?: string }) {
  return (
    <Link className={`brand ${inverse ? "brand-inverse" : ""}`} href={href} aria-label="Twenty home">
      <span className="brand-mark">20</span>
      <span>twenty</span>
    </Link>
  );
}
