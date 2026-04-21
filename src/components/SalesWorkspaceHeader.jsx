/**
 * Sales workspace header with single merged page navigation.
 */
export default function SalesWorkspaceHeader({ endSlot = null }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
      {endSlot ? (
        <div className="flex w-full min-w-0 justify-center sm:w-auto sm:justify-end">{endSlot}</div>
      ) : null}
    </div>
  )
}
