import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Plus } from "lucide-react";

const Packs = () => {
  return (
    <div className="space-y-6 p-6">
    <PageHeader
      title="Packs"
      description='Manage your packs'
      actions={
          <Button >
            <Plus className="mr-2 h-4 w-4" />
            Create Pack
          </Button>
        
      }
    />
    </div>
  )
}

export default Packs;