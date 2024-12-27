import SearchBar from "./SearchBar";
import Link from "next/link";

export default function Nav() {
  return (
    <nav>
      <div className="flex flex-row h-20 bg-c1 justify-center">
        <div className="basis-11/12">
          <div className="flex justify-evenly">
            <div className="basis-2/5 sm:basis-1/5">
              <h2 className="pt-6 text-white font-extrabold text-xl ">
                <Link href="/">Sports-live</Link>
              </h2>
            </div>
            <div className="basis-3/5 sm:basis-4/5">
              <SearchBar />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

