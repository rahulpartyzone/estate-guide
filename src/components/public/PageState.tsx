import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

type PageStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

const PageState = ({ title, description, icon, action }: PageStateProps) => {
  return (
    <Card>
      <CardContent className="py-12 px-6 text-center">
        {icon ? <div className="mb-4 flex justify-center text-muted-foreground">{icon}</div> : null}
        <h3 className="text-2xl font-semibold text-foreground mb-2">{title}</h3>
        {description ? <p className="text-muted-foreground max-w-2xl mx-auto">{description}</p> : null}
        {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
      </CardContent>
    </Card>
  );
};

export default PageState;
