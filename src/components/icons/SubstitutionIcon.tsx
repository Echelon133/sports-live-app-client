import Image from 'next/image';

export default function SubstitutionIcon() {
  return (
    <div className="flex items-center justify-center h-6 w-6 bg-black rounded-full border border-white">
      <Image className="h-4 w-4" width="0" height="0" src="/../substitution.svg" alt="Card" />
    </div>
  )
}

