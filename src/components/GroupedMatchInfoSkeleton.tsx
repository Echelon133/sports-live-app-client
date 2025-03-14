export default function GroupedMatchInfoSkeleton() {
  return (
    <>
      {[...Array(2)].map((_e, i) => {
        return (
          <div key={i} className="bg-c1 mt-8 h-full flex flex-row">
            <div className="mt-2 basis-full">
              <div className="animate-pulse bg-c2 shadow-sm shadow-black">
                <div className="p-3 pl-10">
                  <span className="ml-2"></span>
                </div>
              </div>
              <div>
                {[...Array(2)].map((_e, j) => {
                  return (
                    <div key={j} className="bg-c1 animate-pulse mb-1 h-14 shadow-sm shadow-c0">
                    </div>
                  );
                })}
              </div>
            </div>
          </div >
        );
      })}
    </>
  );
}
