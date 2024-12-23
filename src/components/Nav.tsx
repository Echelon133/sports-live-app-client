import Link from "next/link";

export default function Nav() {
  return (
    <nav>
      <div className="flex h-20 bg-c1">
        <div className="basis-3/5 md:pl-16">
          <h2 className="p-6 text-white font-extrabold text-xl ">
            <Link href="/">Sports-live</Link>
          </h2>
        </div>
        <div className="basis-2/5">
          <div className="mt-7 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-1">
              <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                </path>
              </svg>
            </span>

            <input className="text-black w-5/6 md:w-11/12 pl-8 pr-4 rounded-sm form-input focus:border-indigo-600" type="text"
              placeholder="Search" />
          </div>
        </div>
      </div >
    </nav>
  );
}

