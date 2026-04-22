import { useState } from "react";
import { Link } from "react-router-dom";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface ConsentSheetProps {
  open: boolean;
  onAccept: () => void;
  onOpenChange: (open: boolean) => void;
}

const ConsentSheet = ({ open, onAccept, onOpenChange }: ConsentSheetProps) => {
  const [checked, setChecked] = useState(false);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Перед началом консультации</DrawerTitle>
          <DrawerDescription>
            LexTriage обработает описание вашей ситуации, чтобы ИИ смог дать базовые
            рекомендации и сформировать досье.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-4">
          <div className="flex items-start gap-2">
            <Checkbox
              id="consent-start"
              checked={checked}
              onCheckedChange={(v) => setChecked(v === true)}
              className="mt-0.5"
            />
            <label htmlFor="consent-start" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
              Я согласен на обработку персональных данных и принимаю{" "}
              <Link to="/privacy" target="_blank" className="text-primary underline underline-offset-2">
                Политику конфиденциальности
              </Link>
              .
            </label>
          </div>
          <Button
            variant="hero"
            className="w-full rounded-xl"
            disabled={!checked}
            onClick={onAccept}
          >
            Начать консультацию
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ConsentSheet;
