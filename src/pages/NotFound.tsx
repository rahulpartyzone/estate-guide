import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import Header from "@/components/Header";
import { Link } from "react-router-dom";
import { useText } from "@/content/siteText";

const NotFound = () => {
  const location = useLocation();
  const { t } = useText();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center px-4 py-24">
        <div className="text-center">
          <h1 className="mb-4 text-5xl font-bold text-foreground">{t("other.notFound.title")}</h1>
          <p className="mb-6 text-xl text-muted-foreground">{t("other.notFound.text")}</p>
          <Link to="/" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("other.notFound.link")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
