import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="max-w-md w-full text-center space-y-6 p-8 bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-border">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center shadow-inner">
            <AlertCircle className="w-10 h-10" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-display font-bold text-foreground">Page Not Found</h1>
          <p className="text-muted-foreground">
            The page you are looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="pt-4">
          <Link href="/" className="inline-block w-full">
            <Button size="lg" className="w-full">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
