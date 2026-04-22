import { LucideIcon, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  delta?: number;
}

const MetricCard = ({ icon: Icon, label, value, delta }: MetricCardProps) => {
  return (
    <Card className="p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl glow-blue">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {typeof delta === "number" && (
          <div className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">
            <TrendingUp className="h-3 w-3 text-primary" />
            +{delta}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      </div>
    </Card>
  );
};

export default MetricCard;
