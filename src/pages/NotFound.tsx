import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-7xl font-extrabold bg-gradient-ai bg-clip-text text-transparent mb-4">404</div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Page not found</h2>
        <p className="text-muted-foreground mb-6">The page you are looking for doesn’t exist or has been moved.</p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 shadow-ai"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default NotFound;
