import { Button } from "../ui/button";
import { UserNav } from "@/components/nav/user-nav";
import { Logo } from "@/components/ui/logo";
import { SignedIn, SignedOut, auth } from "@clerk/nextjs";
import Link from "next/link";

export function Navbar() {
  return (
    <nav className="h-16 flex items-center px-4">
      <Logo />
      <SignedIn>
        <Link href="/play" className="text-primary" prefetch={false}>
          ChainLink
        </Link>
      </SignedIn>
      <SignedOut>
        <Link href="/" className="text-primary">
          ChainLink
        </Link>
      </SignedOut>

      <div className="flex items-center ml-auto space-x-4">
        <Button asChild>
          <Link href={"/play"}>Play ⚾</Link>
        </Button>
        <SignedIn>
          <UserNav />
        </SignedIn>
      </div>
    </nav>
  );
}
