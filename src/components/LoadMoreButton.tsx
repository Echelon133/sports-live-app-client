export default function LoadMoreButton(props: { onClick?: any }) {
  return (
    <button
      className="w-full h-12 text-c4 bg-c1 font-extrabold text-sm hover:underline border border-c0"
      onClick={props.onClick}
    >Load More...</button>
  )
}
