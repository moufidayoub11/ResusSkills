import { BarChart3, LineChart, Users } from "lucide-react";

interface EmptyStateProps {
  type: "chart" | "table";
  title: string;
  description?: string;
  icon?: "bar" | "line" | "users";
}

export function EmptyState({ type, title, description, icon = "bar" }: EmptyStateProps) {
  const getIcon = () => {
    switch (icon) {
      case "line":
        return <LineChart className="h-12 w-12 text-muted-foreground" />;
      case "users":
        return <Users className="h-12 w-12 text-muted-foreground" />;
      case "bar":
      default:
        return <BarChart3 className="h-12 w-12 text-muted-foreground" />;
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${type === "chart" ? "h-[300px]" : "h-[400px]"} py-12`}>
      <div className="text-center space-y-3">
        <div className="flex justify-center">{getIcon()}</div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
