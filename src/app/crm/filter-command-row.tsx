
import { PlusIcon } from "@heroicons/react/16/solid";
import { Button } from "../../../vendor/catalyst-ui-kit/typescript/button";

export const FilterCommandRow = ({
  onAddCondition
}: {
  onAddCondition?: () => void
}) => {
  return (
    <div className="flex flex-row gap-4 py-4 border-b border-b-gray-300">
      <div className="w-8 grow-0">
        
      </div>
      <div className="w-36 grow-3">
        <Button
          outline
          onClick={onAddCondition}
          aria-label="Add condition">
          <PlusIcon />
        </Button>
      </div>
      <div className="w-24 grow-2">
        
      </div>
      <div className="w-64 grow-8">
        // TODO: Add a search button
      </div>
    </div>
  )
}
