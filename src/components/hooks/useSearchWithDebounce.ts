import { useEffect, useRef, useState } from "react";


export default function useSearchWithDebounce<PageableSearchOutputType>(
  searchQuery: string,
  baseSearchUrl: string,
  debounceTimeout: number
): PageableSearchOutputType[] {
  const [results, setResults] = useState<PageableSearchOutputType[]>([]);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    // we start a debounce timeout after every new character, if the user is not finished
    // typing we need to cancel the timeout started by the previous character
    if (debounceTimeoutRef.current !== undefined) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = undefined;
    }

    if (searchQuery.length === 0) {
      // clear the results if the user cleared the search value 
      setResults([]);
      return;
    }

    const httpParams = new URLSearchParams({
      name: searchQuery,
      size: "5",
    });

    const queryUrl = `${baseSearchUrl}?${httpParams.toString()}`;

    // save the ref to timeout in case it needs to be cleared because the user is not finished typing
    debounceTimeoutRef.current = setTimeout(() => {
      fetch(queryUrl)
        .then((res) => res.json())
        .then((data) => {
          // Java's pageable results contain the actual results in the 'content' field
          const res: PageableSearchOutputType[] = data['content'];
          setResults(res);
          debounceTimeoutRef.current = undefined;
        })
    }, debounceTimeout);

  }, [searchQuery])

  return results
}
