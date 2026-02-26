import * as React from "react";
import { PlusIcon, MagnifyingGlassIcon, ArrowPathIcon } from "@heroicons/react/16/solid";
import { Button } from "../../../vendor/catalyst-ui-kit/typescript/button";
import { Alert, AlertActions, AlertDescription, AlertTitle } from "../../../vendor/catalyst-ui-kit/typescript/alert";
import clsx from "clsx";

export type CommandRowLocation = "header" | "footer"

export const FilterCommandRow = ({
  location,
  onAddCondition,
  onResetFilters
}: {
  location: CommandRowLocation,
  onAddCondition?: () => void,
  onResetFilters?: () => void
}) => {
  const [ isResetDialogOpen, setIsResetDialogOpen ] = React.useState(false)

  const handleResetClick = (): void => {
    setIsResetDialogOpen(true)
  }

  const handleResetConfirm = (): void => {
    setIsResetDialogOpen(false)
    onResetFilters?.()
  }

  return (
    <>
      <div className={clsx("flex flex-row gap-4 py-4", location === "header" ? "border-b border-b-gray-300" : "")}>
        <div className="w-8 grow-0">
          {location === 'footer' ?
            (<Button
              outline
              onClick={onAddCondition}
              aria-label="Add condition"
              title="Add condition">
              <PlusIcon />
            </Button>) :
            (<Button
              outline
              onClick={handleResetClick}
              aria-label="Reset filters"
              title="Reset filters">
              <ArrowPathIcon />
            </Button>)
          }
        </div>
        <div className="w-36 grow-3">
          {location === 'footer' &&
            <Button
              outline
              onClick={handleResetClick}
              aria-label="Reset filters"
              title="Reset filters">
              <ArrowPathIcon />
              <span className="font-normal">Reset</span>
            </Button>
          }
        </div>
        <div className="w-24 grow-2">
        </div>
        <div className="w-64 grow-8">
          {location === 'footer' &&
            <Button
              outline
              aria-label="Search"
              title="Search">
              <MagnifyingGlassIcon />
              <span className="font-normal">Search</span>
            </Button>
          }
        </div>
      </div>

      <Alert open={isResetDialogOpen} onClose={setIsResetDialogOpen}>
        <AlertTitle>Reset filters?</AlertTitle>
        <AlertDescription>This action will restore default filters.</AlertDescription>
        <AlertActions>
          <Button plain onClick={() => setIsResetDialogOpen(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={handleResetConfirm}>
            Reset
          </Button>
        </AlertActions>
      </Alert>
    </>
  )
}
