import { useEffect, useState } from "react";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export const NetQtyCell = ({
  variant,
  onChange,
}: {
  variant: any;
  onChange: (val: string) => void;
}) => {
  const [qtyValue, setQtyValue] = useState("");
  const [qtyUnit, setQtyUnit] = useState("pc");

  // Sync local state from variant.net_qty
  useEffect(() => {
    if (variant.net_qty) {
      const match = variant.net_qty.match(/^(\d+(?:\.\d+)?)\s*(\w+)$/);
      if (match) {
        setQtyValue(match[1]);

        // Convert pluralized units back to singular for the select
        let unit = match[2];
        switch (unit) {
          case "pcs":
            unit = "pc";
            break;
          case "kgs":
            unit = "kg";
            break;
          case "gms":
            unit = "gms"; // Already plural, keep as is
            break;
          case "ltrs":
            unit = "ltr";
            break;
          case "mls":
            unit = "ml";
            break;
          case "packs":
            unit = "pack";
            break;
          case "dozens":
            unit = "dozen";
            break;
          default:
            unit = match[2];
        }
        setQtyUnit(unit);
      } else {
        setQtyValue("");
        setQtyUnit("pc");
      }
    } else {
      setQtyValue("");
      setQtyUnit("pc");
    }
  }, [variant.id]);

  // Update parent when either value or unit changes
  useEffect(() => {
    if (qtyValue) {
      const quantity = parseFloat(qtyValue);
      const shouldPluralize = quantity > 1;

      // Handle pluralization for different units
      let displayUnit = qtyUnit;
      if (shouldPluralize) {
        switch (qtyUnit) {
          case "pc":
            displayUnit = "pcs";
            break;
          case "kg":
            displayUnit = "kgs";
            break;
          case "gms":
            displayUnit = "gms"; // Already plural
            break;
          case "ltr":
            displayUnit = "ltrs";
            break;
          case "ml":
            displayUnit = "mls";
            break;
          case "pack":
            displayUnit = "packs";
            break;
          case "dozen":
            displayUnit = "dozens";
            break;
          default:
            displayUnit = qtyUnit;
        }
      }

      onChange(`${qtyValue} ${displayUnit}`);
    } else {
      onChange("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qtyValue, qtyUnit]);

  return (
    <div className="flex items-center gap-2 w-full">
      <Input
        type="number"
        min="0"
        value={qtyValue}
        onChange={(e) => setQtyValue(e.target.value)}
        placeholder="Qty"
        className="flex-1"
      />
      <Select value={qtyUnit} onValueChange={setQtyUnit}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pc">pc</SelectItem>
          <SelectItem value="kg">kg</SelectItem>
          <SelectItem value="gms">gms</SelectItem>
          <SelectItem value="ltr">ltr</SelectItem>
          <SelectItem value="ml">ml</SelectItem>
          <SelectItem value="pack">pack</SelectItem>
          <SelectItem value="dozen">dozen</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
